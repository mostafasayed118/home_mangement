"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning" | "destructive";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  title?: string;
  description?: string;
}

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: number) => void;
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const timeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  const removeToast = useCallback((id: number) => {
    // Clear the timeout if it exists
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 3 seconds and store timeout for cleanup
    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timeoutsRef.current.delete(id);
    }, 3000);
    timeoutsRef.current.set(id, timeout);
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = ++toastIdRef.current;
    const type = options.variant || "info";
    const message = options.title || options.description || "";
    setToasts((prev) => [...prev, { id, message, type, title: options.title, description: options.description }]);

    // Auto-remove after 3 seconds and store timeout for cleanup
    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timeoutsRef.current.delete(id);
    }, 3000);
    timeoutsRef.current.set(id, timeout);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-white min-w-[280px] animate-slide-in ${t.type === "success"
              ? "bg-green-600"
              : t.type === "error" || t.type === "destructive"
                ? "bg-red-600"
                : t.type === "warning"
                  ? "bg-yellow-600"
                  : "bg-blue-600"
              }`}
            onClick={() => removeToast(t.id)}
          >
            {t.title && <div className="font-bold">{t.title}</div>}
            {t.description && <div className="text-sm opacity-90">{t.description}</div>}
            {!t.title && !t.description && t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a no-op function if used outside provider
    return {
      addToast: (message: string, type: ToastType = "info") => {
        console.log(`[${type}] ${message}`);
      },
      removeToast: () => { },
      toasts: [],
      toast: (options: ToastOptions) => {
        console.log(`[toast] ${options.title || options.description}`);
      },
    };
  }
  return context;
}
