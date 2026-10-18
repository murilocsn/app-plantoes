import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";

type ModalProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  manageFocus?: boolean;
  closeDisabled?: boolean;
  returnFocusTo?: HTMLElement | null;
};

export function Modal({
  title,
  eyebrow,
  children,
  footer,
  onClose,
  manageFocus = false,
  closeDisabled = false,
  returnFocusTo,
}: ModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!manageFocus) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const controls = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]',
        ),
      ).filter((item) => item.getClientRects().length > 0);
    if (!dialog.contains(document.activeElement)) controls()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener("keydown", keydown);
    return () => {
      dialog.removeEventListener("keydown", keydown);
      if (!dialog.isConnected && returnFocusTo?.isConnected) returnFocusTo.focus();
    };
  }, [manageFocus, returnFocusTo]);
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label={title} aria-modal="true" className="modal" role="dialog" ref={dialogRef}>
        <header className="modal-head">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2>{title}</h2>
          </div>
          <Button
            aria-label="Fechar"
            disabled={closeDisabled}
            onClick={onClose}
            size="icon"
            title="Fechar"
            variant="ghost"
          >
            <X size={18} />
          </Button>
        </header>
        <div className="modal-content">{children}</div>
        {footer && <footer className="modal-actions">{footer}</footer>}
      </section>
    </div>
  );
}
