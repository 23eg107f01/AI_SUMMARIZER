import { useMemo, useRef, useState } from 'react';
import { extractUrl, parseFile } from '../api/client';
import Skeleton from './Skeleton';

export default function InputPanel({ text, onTextChange, onSummarize, addToast }) {
  const [activeTab, setActiveTab] = useState('paste');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [urlValue, setUrlValue] = useState('');
  const [fetchedWordCount, setFetchedWordCount] = useState(0);
  const fileInputRef = useRef(null);
  const dragCountRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const textLength = text.length;
  const wordCount = useMemo(() => {
    return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [text]);
  const showLargeDocumentWarning = textLength > 20_000;
  const isTextReady = textLength >= 100;

  const handleFile = async (file) => {
    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf') && !fileName.endsWith('.docx')) {
      addToast('error', 'Unsupported file type', 'Only PDF and DOCX files are accepted.');
      return;
    }

    setSelectedFile(file);
    setIsParsingFile(true);

    try {
      const response = await parseFile(file);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to parse file.');
      }

      onTextChange(payload.text || '');
      setFetchedWordCount(payload.wordCount || 0);
      addToast('success', 'File parsed', `Extracted ${payload.wordCount || 0} words from ${file.name}.`);
    } catch (error) {
      addToast('error', 'File parsing failed', error.message || 'Unable to parse this file.');
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleUrlFetch = async () => {
    const trimmedUrl = urlValue.trim();
    if (!trimmedUrl) {
      addToast('warning', 'Add a URL first', 'Paste the page link before fetching content.');
      return;
    }

    setIsFetchingUrl(true);

    try {
      const response = await extractUrl(trimmedUrl);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Could not extract content from this URL.');
      }

      onTextChange(payload.text || '');
      setFetchedWordCount(payload.wordCount || 0);
      addToast('success', 'URL extracted', `Pulled ${payload.wordCount || 0} words from the page.`);
    } catch (error) {
      addToast('error', 'URL extraction failed', error.message || 'Could not extract text from this URL.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    dragCountRef.current = 0;
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    await handleFile(file);
  };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-glow dark:border-gray-800 dark:bg-gray-950/80">
      <div className="flex flex-wrap gap-2 rounded-2xl bg-gray-100 p-1 dark:bg-gray-900">
        {[
          { id: 'paste', label: 'Paste Text' },
          { id: 'upload', label: 'Upload File' },
          { id: 'url', label: 'URL' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-950 ${
              activeTab === tab.id
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-950 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-5">
        {activeTab === 'paste' ? (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Paste your content</label>
            <textarea
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              minLength={100}
              maxLength={50_000}
              placeholder="Paste an article, report, transcript, or meeting notes here..."
              className="min-h-[260px] w-full rounded-3xl border border-gray-200 bg-white px-4 py-4 text-sm leading-7 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>{textLength.toLocaleString()} / 50,000 characters</span>
              <span>{wordCount.toLocaleString()} words</span>
            </div>
            {textLength > 0 && !isTextReady ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">Add at least 100 characters before summarizing.</p>
            ) : null}
            {showLargeDocumentWarning ? (
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Large document — output may be truncated</p>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'upload' ? (
          <div
            onDragEnter={() => {
              dragCountRef.current += 1;
              setIsDragging(true);
            }}
            onDragLeave={() => {
              dragCountRef.current -= 1;
              if (dragCountRef.current <= 0) {
                setIsDragging(false);
              }
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className={`rounded-3xl border-2 border-dashed p-6 transition ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10'
                : 'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50'
            }`}
          >
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">Drop a PDF or DOCX file</h3>
                <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">Click to browse or drag and drop a document here. Files must be under 5MB.</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={(event) => handleFile(event.target.files?.[0])}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-offset-gray-950"
              >
                Browse files
              </button>

              {selectedFile ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-950">
                  <p className="font-semibold text-gray-900 dark:text-gray-50">{selectedFile.name}</p>
                  <p className="mt-1 text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : null}

              {isParsingFile ? <Skeleton /> : null}
              {fetchedWordCount ? <p className="text-sm text-gray-600 dark:text-gray-300">Extracted {fetchedWordCount.toLocaleString()} words and loaded them into the editor.</p> : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'url' ? (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Fetch article text from a URL</label>
            <input
              type="url"
              value={urlValue}
              onChange={(event) => setUrlValue(event.target.value)}
              placeholder="https://example.com/article"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleUrlFetch}
                disabled={isFetchingUrl}
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus:ring-offset-gray-950"
              >
                {isFetchingUrl ? 'Fetching…' : 'Fetch'}
              </button>
              {isFetchingUrl ? <span className="text-sm text-gray-500 dark:text-gray-400">Reading article body…</span> : null}
            </div>
            {fetchedWordCount ? <p className="text-sm text-gray-600 dark:text-gray-300">Extracted {fetchedWordCount.toLocaleString()} words from the URL.</p> : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">The app will summarize whatever text is currently loaded in the editor.</p>
          <button
            type="button"
            onClick={onSummarize}
            disabled={!isTextReady}
            className="inline-flex items-center justify-center rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-white dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white dark:focus:ring-offset-gray-950"
          >
            Summarize
          </button>
        </div>
      </div>
    </section>
  );
}