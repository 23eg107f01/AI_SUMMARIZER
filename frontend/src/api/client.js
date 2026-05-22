const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function summarizeText(text, length, format, tone, signal) {
  return fetch(`${API_BASE_URL}/api/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({ text, length, format, tone }),
  });
}

export function compareDocuments(docs, signal) {
  return fetch(`${API_BASE_URL}/api/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({ docs }),
  });
}

export function extractUrl(url) {
  return fetch(`${API_BASE_URL}/api/extract-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });
}

export function parseFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  return fetch(`${API_BASE_URL}/api/parse-file`, {
    method: 'POST',
    body: formData,
  });
}

export { API_BASE_URL };