import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
};

const styles: Record<ToastType, string> = {
  success: 'bg-emerald-900/90 text-emerald-100 border border-emerald-700/60',
  error:   'bg-red-900/90 text-red-100 border border-red-700/60',
  info:    'bg-blue-900/90 text-blue-100 border border-blue-700/60',
  warning: 'bg-amber-900/90 text-amber-100 border border-amber-700/60',
};

const iconColors: Record<ToastType, string> = {
  success: 'text-emerald-400',
  error:   'text-red-400',
  info:    'text-blue-400',
  warning: 'text-amber-400',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 w-96 max-w-[calc(100vw-3rem)]">
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 rounded-xl p-4 shadow-2xl backdrop-blur-sm ${styles[toast.type]} animate-slide-up`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColors[toast.type]}`} />
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              <button onClick={() => dismiss(toast.id)} className="text-current opacity-60 hover:opacity-100 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
