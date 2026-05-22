const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();
const langsmith = require('../langsmith');
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

  if (!text) {
    try {
      text = JSON.stringify(data);
    } catch (e) {
      text = String(data || '');
    }
  }

  return text;
}

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

async function streamSummary({ text, length, format, tone, onToken }) {
  const prompt = `You are a precise content summarizer. Preserve factual accuracy. Never hallucinate. If unsure about a fact, omit it. Format: ${format}. Tone: ${tone}. Length: ${length}.\n\n${text}`;
  const result = await callGroqOnce(prompt, 800);

  emitChunkedText(result, onToken);

  return result;
}

router.post('/api/summarize', async (req, res) => {
  const { text = '', length = 'Medium', format = 'Paragraph', tone = 'Neutral' } = req.body || {};
  const truncatedText = String(text).slice(0, 80_000);
  const originalWordCount = wordCount(truncatedText);

  if (!truncatedText.trim()) {
    return res.status(400).json({ error: 'Please provide text to summarize.' });
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  // Send a start trace to LangSmith (best-effort)
  try {
    await langsmith.sendTrace({
      name: 'summarize.request',
      payload: { length, format, tone, originalWordCount, snippet: truncatedText.slice(0, 200) },
    });
  } catch (e) {
    console.warn('LangSmith trace error (start):', e && e.message ? e.message : e);
  }

  try {
    let summary = '';
    await streamSummary({
      text: truncatedText,
      length,
      format,
      tone,
      onToken: (token) => {
        summary += token;
        res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
      },
    });

    const summaryWordCount = wordCount(summary);

    // Send finish trace
    try {
      await langsmith.sendTrace({
        name: 'summarize.finished',
        payload: { summary: summary.slice(0, 2000), original: originalWordCount, summaryWords: summaryWordCount },
      });
    } catch (e) {
      console.warn('LangSmith trace error (finish):', e && e.message ? e.message : e);
    }

    res.write(`event: done\ndata: ${JSON.stringify({ summary, wordCounts: { original: originalWordCount, summary: summaryWordCount } })}\n\n`);
    res.end();
  } catch (error) {
    // Send error trace
    try {
      await langsmith.sendTrace({
        name: 'summarize.error',
        payload: { message: error.message || 'Summarization failed.' },
      });
    } catch (e) {
      console.warn('LangSmith trace error (error):', e && e.message ? e.message : e);
    }

    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Summarization failed.' })}\n\n`);
    res.end();
  }
});

module.exports = router;