import { X } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastTone = "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

const DEFAULT_DURATION_MS = 8000;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<(items: ToastItem[]) => void>();

function emit() {
  for (const listener of listeners) {
    listener([...toasts]);
  }
}

export function dismissToast(id: number) {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

export function showToast(
  message: string,
  tone: ToastTone = "error",
  durationMs = DEFAULT_DURATION_MS,
) {
  const id = nextId;
  nextId += 1;
  toasts = [...toasts, { id, message, tone }];
  emit();

  if (durationMs > 0) {
    setTimeout(() => dismissToast(id), durationMs);
  }

  return id;
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>(toasts);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  if (!items.length) {
    return null;
  }

  return (
    <div aria-label="Avisos" className="toast-host" role="region">
      {items.map((item) => (
        <div className={`toast-item toast-${item.tone}`} key={item.id} role="alert">
          <span>{item.message}</span>
          <button
            aria-label="Fechar aviso"
            className="toast-close"
            onClick={() => dismissToast(item.id)}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
