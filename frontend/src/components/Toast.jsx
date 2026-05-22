import { useEffect } from 'react';

export default function Toast({ toasts, onDismiss }) {
  useEffect(() => {
    const timers = toasts.map((toast) => {
      return window.setTimeout(() => {
        onDismiss(toast.id);
      }, 4000);
    });

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [toasts, onDismiss]);

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-2xl border p-4 shadow-glow backdrop-blur transition ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/60 dark:text-emerald-50'
              : toast.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-950 dark:border-red-900/40 dark:bg-red-950/60 dark:text-red-50'
                : toast.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/60 dark:text-amber-50'
                  : 'border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-50'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.message ? <p className="mt-1 text-sm leading-6 opacity-90">{toast.message}</p> : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss toast"
              onClick={() => onDismiss(toast.id)}
              className="rounded-full p-1 text-current transition hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-transparent"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}