const express = require('express');
const fetch = require('node-fetch');
const { traceable } = require('langsmith/traceable');

const router = express.Router();
const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

async function callGroqOnce(prompt, maxTokens = 1024) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('Missing GROQ_API_KEY in environment.');
  }

  const body = {
    model: GROQ_MODEL,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: maxTokens,
    temperature: 0.2,
  };

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => 'Groq API error');
    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after');
      const waitSeconds = Number(retryAfter || 4);
      throw new Error(`Groq rate limit reached. Please wait ${Number.isFinite(waitSeconds) ? waitSeconds : 4}s and try again.`);
    }

    throw new Error(txt || 'Groq API error');
  }

  const data = await res.json().catch(() => null);

  let text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';

  // Fallback to stringify everything
  if (!text) {
    try {
      text = JSON.stringify(data);
    } catch (e) {
      text = String(data || '');
    }
  }

  return text;
}

const tracedCallGroqOnce = traceable(callGroqOnce, {
  name: 'groq.chat.completions',
  run_type: 'llm',
  getInvocationParams: (_prompt, maxTokens = 1024) => ({
    provider: 'groq',
    model: GROQ_MODEL,
    max_tokens: maxTokens,
  }),
  processInputs: (inputs) => ({
    promptLength: String(inputs?.args?.[0] || '').length,
    maxTokens: inputs?.args?.[1],
  }),
});

function wordCount(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function emitChunkedText(text, onToken, chunkSize = 200) {
  if (typeof onToken !== 'function') {
    return;
  }

  for (let i = 0; i < text.length; i += chunkSize) {
    onToken(text.slice(i, i + chunkSize));
  }
}

async function summarizeDocument(text, label, onToken) {
  const prompt = `You are a precise content summarizer. Preserve factual accuracy. Never hallucinate. If unsure about a fact, omit it. Provide a concise but useful document summary.\n\nSummarize the document labeled ${label}. Keep the summary concise and factual.\n\n${text}`;
  const result = await tracedCallGroqOnce(prompt, 700);

  // Simulate streaming by chunking the result
  emitChunkedText(result, onToken);

  return result;
}

async function runCombinedAnalysis(summaries, onToken) {
  const prompt = `You are a research analyst. Given multiple document summaries produce exactly three labeled sections: OVERLAPS: bullet list of shared themes. DIFFERENCES: bullet list of key contrasts. TAKEAWAYS: 1 to 2 bold unified insights. Label each section in uppercase exactly as shown.\n\nAnalyze these document summaries and produce the required three-section response.\n\n${summaries.map((item) => `${item.name}:\n${item.summary}`).join('\n\n---\n\n')}`;
  const result = await tracedCallGroqOnce(prompt, 700);

  emitChunkedText(result, onToken);

  return result;
}

const tracedSummarizeDocument = traceable(summarizeDocument, {
  name: 'compare.document_summary',
  run_type: 'chain',
  processInputs: (inputs) => ({
    textLength: String(inputs?.text || '').length,
    label: inputs?.label,
  }),
  processOutputs: (outputs) => ({
    summaryLength: String(outputs?.outputs || '').length,
  }),
});

const tracedRunCombinedAnalysis = traceable(runCombinedAnalysis, {
  name: 'compare.analysis',
  run_type: 'chain',
  processInputs: (inputs) => ({
    summaryCount: Array.isArray(inputs?.summaries) ? inputs.summaries.length : 0,
  }),
  processOutputs: (outputs) => ({
    analysisLength: String(outputs?.outputs || '').length,
  }),
});

router.post('/api/compare', async (req, res) => {
  const docs = Array.isArray(req.body?.docs) ? req.body.docs : [];

  if (docs.length < 2 || docs.length > 3) {
    return res.status(400).json({ error: 'Please provide 2 to 3 documents.' });
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  try {
    const summaries = [];

    for (let index = 0; index < docs.length; index += 1) {
      const doc = docs[index] || {};
      const name = doc.name || `Document ${index + 1}`;
      const text = String(doc.text || '').slice(0, 80_000);

      res.write(`event: document-start\ndata: ${JSON.stringify({ index, name })}\n\n`);

      let summary = '';
      await tracedSummarizeDocument(text, name, (token) => {
        summary += token;
        res.write(`event: document-token\ndata: ${JSON.stringify({ index, token })}\n\n`);
      });

      res.write(`event: document-done\ndata: ${JSON.stringify({ index, name, summary, wordCount: wordCount(summary) })}\n\n`);
      summaries.push({ name, summary });
    }

    let combined = '';
    await tracedRunCombinedAnalysis(summaries, (token) => {
      combined += token;
      res.write(`event: analysis-token\ndata: ${JSON.stringify({ token })}\n\n`);
    });

    res.write(`event: analysis-done\ndata: ${JSON.stringify({ summary: combined })}\n\n`);
    res.write(`event: done\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Comparison failed.' })}\n\n`);
    res.end();
  }
});

module.exports = router;