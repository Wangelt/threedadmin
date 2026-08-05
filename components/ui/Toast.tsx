"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastTone = "ok" | "err" | "info";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((prev) => [...prev.slice(-4), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message) => toast(message, "ok"),
      error: (message) => toast(message, "err"),
      info: (message) => toast(message, "info"),
      clear,
    }),
    [toast, clear]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto border px-4 py-3 text-sm shadow-[4px_4px_0_#0a0a0a] ${
              item.tone === "err"
                ? "border-black bg-black text-white"
                : item.tone === "ok"
                  ? "border-black bg-white text-black"
                  : "border-black bg-[#f4f4f4] text-black"
            }`}
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="leading-snug">{item.message}</p>
              <button
                type="button"
                className="shrink-0 text-xs uppercase tracking-wide opacity-70 hover:opacity-100"
                onClick={() => dismiss(item.id)}
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
