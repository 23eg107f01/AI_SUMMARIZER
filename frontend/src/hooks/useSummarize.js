import { useRef, useState } from 'react';
import { summarizeText } from '../api/client';

function countWords(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

async function readResponseStream(response, onToken) {
  if (!response.body) {
    throw new Error('Streaming is not supported in this browser.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const eventBlock of events) {
      const lines = eventBlock.split('\n');
      let eventName = 'message';
      const dataLines = [];

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }

      const dataText = dataLines.join('\n');
      if (!dataText) {
        continue;
      }

      const parsed = JSON.parse(dataText);

      if (eventName === 'token' && parsed.token) {
        fullText += parsed.token;
        onToken(fullText);
      }

      if (eventName === 'done') {
        return { summary: parsed.summary || fullText, wordCounts: parsed.wordCounts || null };
      }

      if (eventName === 'error') {
        throw new Error(parsed.error || 'Summarization failed.');
      }
    }
  }

  return { summary: fullText, wordCounts: null };
}

export function useSummarize() {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [wordCounts, setWordCounts] = useState({ original: 0, summary: 0 });
  const abortRef = useRef(null);

  const stop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
  };

  const summarize = async (text, length, format, tone) => {
    const trimmedText = String(text || '').trim();

    if (!trimmedText) {
      setError('Please provide text to summarize.');
      return null;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError('');
    setSummary('');
    setWordCounts({ original: countWords(trimmedText), summary: 0 });

    try {
      const response = await summarizeText(trimmedText, length, format, tone, controller.signal);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Summarization failed.');
      }

      const result = await readResponseStream(response, (currentSummary) => {
        setSummary(currentSummary);
        setWordCounts({
          original: countWords(trimmedText),
          summary: countWords(currentSummary),
        });
      });

      setSummary(result.summary || '');
      const summaryCount = countWords(result.summary || '');
      const counts = result.wordCounts || { original: countWords(trimmedText), summary: summaryCount };
      setWordCounts(counts);
      setIsLoading(false);
      abortRef.current = null;
      return result.summary || '';
    } catch (streamError) {
      if (streamError.name === 'AbortError') {
        setIsLoading(false);
        setError('Summary generation stopped.');
        abortRef.current = null;
        return null;
      }

      setError(streamError.message || 'An unexpected error occurred.');
      setIsLoading(false);
      abortRef.current = null;
      return null;
    }
  };

  return {
    summary,
    isLoading,
    error,
    stop,
    wordCounts,
    summarize,
  };
}