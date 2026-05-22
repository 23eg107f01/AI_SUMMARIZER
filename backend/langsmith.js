const fetch = require('node-fetch');

const LANGSMITH_API_KEY = process.env.LANGSMITH_API_KEY;
const LANGSMITH_PROJECT = process.env.LANGSMITH_PROJECT || 'default';
const LANGSMITH_API_URL = process.env.LANGSMITH_ENDPOINT || process.env.LANGSMITH_API_URL || 'https://api.langsmith.com/v1';
const LANGSMITH_TRACING = String(process.env.LANGSMITH_TRACING || '').toLowerCase() === 'true';

async function sendTrace(trace) {
  // No-op when not configured
  if (!LANGSMITH_TRACING || !LANGSMITH_API_KEY) return;

  const url = `${LANGSMITH_API_URL.replace(/\/$/, '')}/projects/${encodeURIComponent(LANGSMITH_PROJECT)}/traces`;

  const payload = {
    name: trace.name || 'app.trace',
    timestamp: new Date().toISOString(),
    payload: trace.payload || trace,
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${LANGSMITH_API_KEY}`,
      },
      body: JSON.stringify(payload),
      timeout: 5000,
    });
  } catch (err) {
    // don't block app flow for telemetry failures
    console.warn('LangSmith trace failed:', err && err.message ? err.message : err);
  }
}

module.exports = { sendTrace };
