import { useMemo, useState } from 'react';
import { compareDocuments, parseFile } from '../api/client';
import Skeleton from './Skeleton';

function countWords(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

async function readCompareStream(response, onEvent) {
  if (!response.body) {
    throw new Error('Streaming is not supported in this browser.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

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
      onEvent(eventName, parsed);

      if (eventName === 'error') {
        throw new Error(parsed.error || 'Comparison failed.');
      }
    }
  }
}

function parseAnalysisSections(text) {
  const sections = {
    OVERLAPS: [],
    DIFFERENCES: [],
    TAKEAWAYS: '',
  };

  const overlapsMatch = text.match(/OVERLAPS:\s*([\s\S]*?)(?=\nDIFFERENCES:|\nTAKEAWAYS:|$)/i);
  const differencesMatch = text.match(/DIFFERENCES:\s*([\s\S]*?)(?=\nTAKEAWAYS:|$)/i);
  const takeawaysMatch = text.match(/TAKEAWAYS:\s*([\s\S]*)$/i);

  const toBullets = (value) =>
    value
      .split('\n')
      .map((line) => line.replace(/^[-•*\s]+/, '').trim())
      .filter(Boolean);

  if (overlapsMatch) {
    sections.OVERLAPS = toBullets(overlapsMatch[1]);
  }

  if (differencesMatch) {
    sections.DIFFERENCES = toBullets(differencesMatch[1]);
  }

  if (takeawaysMatch) {
    sections.TAKEAWAYS = takeawaysMatch[1].trim();
  }

  return sections;
}

function DocumentCard({ doc, index, onChange, onRemove, onToggle, onFileUpload }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-glow dark:border-gray-800 dark:bg-gray-950/80">
      <button
        type="button"
        onClick={() => onToggle(doc.id)}
        className="flex w-full items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 text-left dark:border-gray-800"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">Document {index + 1}</p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-50">{doc.name || `Document ${index + 1}`}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{doc.wordCount ? `${doc.wordCount.toLocaleString()} words` : 'No content loaded yet'}</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-300">
          {doc.isOpen ? 'Collapse' : 'Expand'}
        </span>
      </button>

      {doc.isOpen ? (
        <div className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Paste or edit text</label>
              <textarea
                value={doc.text}
                onChange={(event) => onChange(doc.id, { text: event.target.value, wordCount: countWords(event.target.value) })}
                minLength={100}
                maxLength={50_000}
                className="min-h-[220px] w-full rounded-3xl border border-gray-200 bg-white px-4 py-4 text-sm leading-7 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                placeholder="Paste a document for comparison"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">{doc.text.length.toLocaleString()} / 50,000 characters</p>
              {doc.text.length > 0 && doc.text.length < 100 ? <p className="text-sm text-amber-600 dark:text-amber-400">Add at least 100 characters.</p> : null}
            </div>

            <div className="space-y-3 rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/70">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Upload file</label>
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(event) => onFileUpload(doc.id, event.target.files?.[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500 dark:text-gray-400"
              />
              {doc.fileName ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                  <p className="font-semibold text-gray-900 dark:text-gray-50">{doc.fileName}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{doc.fileSizeLabel}</p>
                </div>
              ) : null}
              {doc.isParsing ? <Skeleton /> : null}
            </div>
          </div>

          {doc.summary ? (
            <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-300">Individual summary</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-800 dark:text-gray-100">{doc.summary}</p>
            </div>
          ) : doc.isLoading ? (
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/60">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Summarizing document…</p>
              <div className="mt-4">
                <Skeleton />
              </div>
            </div>
          ) : null}

          {doc.error ? <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{doc.error}</p> : null}

          {onRemove ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onRemove(doc.id)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-rose-300 hover:text-rose-600 dark:border-gray-800 dark:text-gray-300 dark:hover:border-rose-700 dark:hover:text-rose-300"
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function CompareMode({ addToast }) {
  const [docs, setDocs] = useState([
    {
      id: crypto.randomUUID(),
      name: 'Document 1',
      text: '',
      summary: '',
      wordCount: 0,
      isOpen: true,
      isLoading: false,
      isParsing: false,
      fileName: '',
      fileSizeLabel: '',
      error: '',
    },
    {
      id: crypto.randomUUID(),
      name: 'Document 2',
      text: '',
      summary: '',
      wordCount: 0,
      isOpen: true,
      isLoading: false,
      isParsing: false,
      fileName: '',
      fileSizeLabel: '',
      error: '',
    },
  ]);
  const [isComparing, setIsComparing] = useState(false);
  const [combinedAnalysis, setCombinedAnalysis] = useState('');
  const [combinedError, setCombinedError] = useState('');

  const docsReady = useMemo(() => docs.filter((doc) => doc.text.trim().length >= 100).length, [docs]);
  const parsedSections = useMemo(() => parseAnalysisSections(combinedAnalysis), [combinedAnalysis]);

  const updateDoc = (id, changes) => {
    setDocs((currentDocs) => currentDocs.map((doc) => (doc.id === id ? { ...doc, ...changes } : doc)));
  };

  const toggleDoc = (id) => {
    setDocs((currentDocs) => currentDocs.map((doc) => (doc.id === id ? { ...doc, isOpen: !doc.isOpen } : doc)));
  };

  const addDocument = () => {
    if (docs.length >= 3) {
      return;
    }

    setDocs((currentDocs) => [
      ...currentDocs,
      {
        id: crypto.randomUUID(),
        name: `Document ${currentDocs.length + 1}`,
        text: '',
        summary: '',
        wordCount: 0,
        isOpen: true,
        isLoading: false,
        isParsing: false,
        fileName: '',
        fileSizeLabel: '',
        error: '',
      },
    ]);
  };

  const removeDocument = (id) => {
    if (docs.length <= 2) {
      return;
    }

    setDocs((currentDocs) => currentDocs.filter((doc) => doc.id !== id));
  };

  const handleFileUpload = async (id, file) => {
    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf') && !fileName.endsWith('.docx')) {
      addToast('error', 'Unsupported file type', 'Only PDF and DOCX files are accepted.');
      return;
    }

    updateDoc(id, {
      isParsing: true,
      fileName: file.name,
      fileSizeLabel: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      error: '',
    });

    try {
      const response = await parseFile(file);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to parse file.');
      }

      updateDoc(id, {
        text: payload.text || '',
        wordCount: payload.wordCount || 0,
        summary: '',
        isParsing: false,
      });
      addToast('success', 'File parsed', `Loaded ${payload.wordCount || 0} words into ${file.name}.`);
    } catch (error) {
      updateDoc(id, { isParsing: false, error: error.message || 'Unable to parse file.' });
      addToast('error', 'File parsing failed', error.message || 'Unable to parse this file.');
    }
  };

  const handleCompare = async () => {
    const activeDocs = docs.filter((doc) => doc.text.trim().length >= 100).slice(0, 3);
    if (activeDocs.length < 2) {
      setCombinedError('Please provide at least 2 documents with enough text.');
      return;
    }

    const activeDocIds = activeDocs.map((doc) => doc.id);
    setIsComparing(true);
    setCombinedError('');
    setCombinedAnalysis('');
    setDocs((currentDocs) =>
      currentDocs.map((doc) => ({
        ...doc,
        summary: '',
        isLoading: activeDocIds.includes(doc.id),
      }))
    );

    try {
      const response = await compareDocuments(activeDocs.map((doc) => ({ name: doc.name, text: doc.text })));
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Comparison failed.');
      }

      let combinedText = '';
      await readCompareStream(response, (eventName, payload) => {
        if (eventName === 'document-start') {
          const docId = activeDocIds[payload.index];
          if (docId) {
            setDocs((currentDocs) =>
              currentDocs.map((doc) =>
                doc.id === docId
                  ? {
                      ...doc,
                      isLoading: true,
                      error: '',
                    }
                  : doc
              )
            );
          }
        }

        if (eventName === 'document-token') {
          const docId = activeDocIds[payload.index];
          if (docId) {
            setDocs((currentDocs) =>
              currentDocs.map((doc) =>
                doc.id === docId
                  ? {
                      ...doc,
                      summary: `${doc.summary || ''}${payload.token || ''}`,
                    }
                  : doc
              )
            );
          }
        }

        if (eventName === 'document-done') {
          const docId = activeDocIds[payload.index];
          if (docId) {
            setDocs((currentDocs) =>
              currentDocs.map((doc) =>
                doc.id === docId
                  ? {
                      ...doc,
                      summary: payload.summary || doc.summary,
                      wordCount: payload.wordCount || doc.wordCount,
                      isLoading: false,
                    }
                  : doc
              )
            );
          }
        }

        if (eventName === 'analysis-token') {
          combinedText += payload.token || '';
          setCombinedAnalysis(combinedText);
        }

        if (eventName === 'analysis-done') {
          setCombinedAnalysis(payload.summary || combinedText);
        }
      });

      setIsComparing(false);
    } catch (error) {
      setCombinedError(error.message || 'Comparison failed.');
      setIsComparing(false);
      setDocs((currentDocs) => currentDocs.map((doc) => ({ ...doc, isLoading: false })));
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-glow dark:border-gray-800 dark:bg-gray-950/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">Compare & Combine</p>
            <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-50">Analyze document overlap and contrast</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">Load two or three documents, generate individual summaries, then produce a combined analysis with overlaps, differences, and takeaways.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-300">
              {docsReady} ready
            </span>
            {docs.length < 3 ? (
              <button
                type="button"
                onClick={addDocument}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-800 dark:text-gray-200 dark:hover:border-indigo-400 dark:hover:text-indigo-400"
              >
                Add document
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {docs.map((doc, index) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            index={index}
            onChange={updateDoc}
            onRemove={docs.length > 2 ? removeDocument : null}
            onToggle={toggleDoc}
            onFileUpload={handleFileUpload}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-5 shadow-glow dark:border-gray-800 dark:bg-gray-950/80 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">The compare run streams each document summary first and then writes the combined analysis below.</p>
        <button
          type="button"
          onClick={handleCompare}
          disabled={isComparing || docsReady < 2}
          className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-offset-gray-950"
        >
          {isComparing ? 'Comparing…' : 'Compare & Combine'}
        </button>
      </div>

      {combinedError ? <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{combinedError}</p> : null}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-glow dark:border-gray-800 dark:bg-gray-950/80">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">Combined Analysis</p>
            <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-50">Overlaps, differences, and takeaways</h3>
          </div>
          {isComparing ? <span className="text-sm text-gray-500 dark:text-gray-400">Streaming analysis…</span> : null}
        </div>

        {combinedAnalysis ? (
          <div className="mt-6 space-y-4">
            <AnalysisSection icon="◎" title="OVERLAPS" bullets={parsedSections.OVERLAPS} />
            <AnalysisSection icon="⇄" title="DIFFERENCES" bullets={parsedSections.DIFFERENCES} />
            <AnalysisSection icon="★" title="TAKEAWAYS" paragraph={parsedSections.TAKEAWAYS} />
          </div>
        ) : isComparing ? (
          <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/60">
            <Skeleton />
          </div>
        ) : (
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Your combined analysis will appear here after comparison.</p>
        )}
      </section>
    </section>
  );
}

function AnalysisSection({ icon, title, bullets, paragraph }) {
  return (
    <article className="rounded-3xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/60">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white dark:bg-indigo-500">{icon}</span>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h4>
      </div>
      {bullets && bullets.length ? (
        <ul className="mt-4 space-y-2 text-sm leading-7 text-gray-700 dark:text-gray-200">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3">
              <span className="mt-2 h-2 w-2 rounded-full bg-indigo-500 dark:bg-indigo-400" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {paragraph ? <p className="mt-4 text-sm leading-7 text-gray-800 dark:text-gray-100"><strong>{paragraph}</strong></p> : null}
    </article>
  );
}