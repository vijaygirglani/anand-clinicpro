import { useState, useEffect } from "react";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

interface ToastEntry extends ToastOptions {
  id: number;
}

let _setter: React.Dispatch<React.SetStateAction<ToastEntry[]>> | null = null;
let _counter = 0;

export function toast(opts: ToastOptions) {
  const id = ++_counter;
  _setter?.(prev => [...prev.slice(-3), { ...opts, id }]);
  setTimeout(() => {
    _setter?.(prev => prev.filter(t => t.id !== id));
  }, 3000);
}

export function useSimpleToast() {
  return { toast };
}

export function SimpleToaster() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  useEffect(() => {
    _setter = setToasts;
    return () => { _setter = null; };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "1.5rem",
      right: "1.5rem",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.variant === "destructive" ? "#dc2626" : "#1e293b",
          color: "#fff",
          borderRadius: "0.75rem",
          padding: "0.75rem 1.125rem",
          maxWidth: "380px",
          minWidth: "200px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
          pointerEvents: "auto",
          opacity: 1,
        }}>
          <p style={{ fontWeight: 700, fontSize: "0.875rem", margin: 0 }}>{t.title}</p>
          {t.description && (
            <p style={{ fontSize: "0.8rem", marginTop: "0.25rem", opacity: 0.85, margin: "0.25rem 0 0" }}>
              {t.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
