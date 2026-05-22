import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useCallback, useMemo, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';
import CompareMode from './components/CompareMode';
import SummaryOptions from './components/SummaryOptions';
import Toast from './components/Toast';
import { useSummarize } from './hooks/useSummarize';
import { useTheme } from './hooks/useTheme';

function wordCount(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function SummarizePage({ addToast }) {
  const [text, setText] = useState('');
  const [options, setOptions] = useState({
    length: 'Medium',
    format: 'Paragraph',
    tone: 'Neutral',
  });
  const { summary, isLoading, error, stop, wordCounts, summarize } = useSummarize();

  const handleOptionChange = (name, value) => {
    setOptions((currentOptions) => ({
      ...currentOptions,
      [name]: value,
    }));
  };

  const handleSummarize = async () => {
    if (text.trim().length < 100) {
      addToast('warning', 'Add more content', 'The input needs at least 100 characters before it can be summarized.');
      return;
    }

    const result = await summarize(text, options.length, options.format, options.tone);
    if (!result) {
      addToast('error', 'Summarization failed', 'The summary could not be generated.');
      return;
    }

    addToast('success', 'Summary ready', 'Groq finished streaming the summary.');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <InputPanel text={text} onTextChange={setText} onSummarize={handleSummarize} addToast={addToast} />
        <SummaryOptions value={options} onChange={handleOptionChange} />
      </div>
      <OutputPanel summary={summary} isLoading={isLoading} error={error} stop={stop} wordCounts={wordCounts} />
    </div>
  );
}

function ComparePage({ addToast }) {
  return <CompareMode addToast={addToast} />;
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, title, message) => {
    const id = crypto.randomUUID();
    setToasts((currentToasts) => [...currentToasts, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const navClass = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      isActive
        ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-50'
    }`;

  const themeLabel = useMemo(() => (theme === 'dark' ? 'Light mode' : 'Dark mode'), [theme]);

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_28%)] px-4 py-6 text-gray-800 transition-colors duration-300 dark:text-gray-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="sticky top-4 z-20 rounded-3xl border border-gray-200/80 bg-white/85 px-4 py-4 shadow-glow backdrop-blur dark:border-gray-800/80 dark:bg-gray-950/80">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">AI Content Summarizer</p>
                <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-50">Stream summaries and document comparisons in one place.</h1>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="ml-auto inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-indigo-400 dark:hover:text-indigo-400 dark:focus:ring-offset-gray-950"
              >
                {themeLabel}
              </button>
            </div>
            <nav className="mt-5 flex flex-wrap gap-2">
              <NavLink to="/" className={navClass} end>
                Summarize
              </NavLink>
              <NavLink to="/compare" className={navClass}>
                Compare & Combine
              </NavLink>
            </nav>
          </header>

          <main className="relative z-10 mt-6">
            <Routes>
              <Route path="/" element={<SummarizePage addToast={addToast} />} />
              <Route path="/summarize" element={<SummarizePage addToast={addToast} />} />
              <Route path="/compare" element={<ComparePage addToast={addToast} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        <Toast toasts={toasts} onDismiss={removeToast} />
      </div>
    </ErrorBoundary>
  );
}