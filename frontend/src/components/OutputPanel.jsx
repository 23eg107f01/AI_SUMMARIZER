import { useMemo, useState } from 'react';
import { summarizeText } from '../api/client';

function countWords(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

async function readTweetStream(response) {
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
      }

      if (eventName === 'done') {
        return parsed.summary || fullText;
      }

      if (eventName === 'error') {
        throw new Error(parsed.error || 'Tweet generation failed.');
      }
    }
  }

  return fullText;
}

export default function OutputPanel({ summary, isLoading, error, stop, wordCounts }) {
  const [copyState, setCopyState] = useState('Copy to clipboard');
  const [tweetVersion, setTweetVersion] = useState('');
  const [tweetLoading, setTweetLoading] = useState(false);
  const [tweetError, setTweetError] = useState('');

  const summaryWordCount = useMemo(() => countWords(summary), [summary]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary || '');
      setCopyState('Copied');
      window.setTimeout(() => setCopyState('Copy to clipboard'), 2000);
    } catch (clipboardError) {
      setCopyState('Copy failed');
      window.setTimeout(() => setCopyState('Copy to clipboard'), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([summary || ''], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'summary.txt';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleTweetVersion = async () => {
    if (!summary) {
      return;
    }

    setTweetLoading(true);
    setTweetError('');
    setTweetVersion('');

    try {
      const response = await summarizeText(`Condense the following summary into a tweet under 280 characters. Return only the final tweet text.\n\n${summary}`, 'Short', 'Paragraph', 'Executive');
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Tweet generation failed.');
      }

      const condensed = await readTweetStream(response);
      setTweetVersion((condensed || '').slice(0, 280));
    } catch (streamError) {
      setTweetError(streamError.message || 'Tweet generation failed.');
    } finally {
      setTweetLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-glow dark:border-gray-800 dark:bg-gray-950/80">
      {isLoading ? <div className="absolute inset-x-0 top-0 h-1 animate-pulse bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500" /> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">Output</p>
          <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-50">Streaming summary</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!summary}
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-indigo-400 dark:hover:text-indigo-400"
          >
            {copyState}
          </button>
          <button
            type="button"
            onClick={handleTweetVersion}
            disabled={!summary || tweetLoading}
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-indigo-400 dark:hover:text-indigo-400"
          >
            {tweetLoading ? 'Condensing…' : 'Tweet version'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!summary}
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-indigo-400 dark:hover:text-indigo-400"
          >
            Download as .txt
          </button>
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex items-center justify-center rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              Stop
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/70">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Summary</span>
          <span>
            Original: {wordCounts.original.toLocaleString()} words → Summary: {summaryWordCount.toLocaleString()} words
          </span>
        </div>
        <div className="mt-4 min-h-[240px] whitespace-pre-wrap rounded-2xl bg-white p-5 text-base leading-8 text-gray-800 dark:bg-gray-950 dark:text-gray-100">
          {summary || error ? (
            <>
              {summary || error}
              {isLoading ? <span className="ml-1 inline-block h-5 w-2 animate-cursor-blink rounded-sm bg-indigo-500 align-middle dark:bg-indigo-400" /> : null}
            </>
          ) : (
            <p className="text-gray-400 dark:text-gray-500">Your streamed summary will appear here.</p>
          )}
        </div>
        {error ? <p className="mt-4 text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p> : null}
      </div>

      {tweetError ? <p className="mt-4 text-sm font-medium text-rose-600 dark:text-rose-400">{tweetError}</p> : null}
      {tweetVersion ? (
        <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-300">Tweet version</p>
          <p className="mt-2 text-sm leading-6 text-gray-800 dark:text-gray-100">{tweetVersion}</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{tweetVersion.length.toLocaleString()} / 280 characters</p>
        </div>
      ) : null}
      {tweetLoading ? <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Generating a condensed version from Groq…</p> : null}
    </section>
  );
}