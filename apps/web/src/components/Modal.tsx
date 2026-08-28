import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

type ModalProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

export function Modal({ title, eyebrow, children, footer, onClose }: ModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="modal" role="dialog">
        <header className="modal-head">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2>{title}</h2>
          </div>
          <Button aria-label="Fechar" onClick={onClose} size="icon" title="Fechar" variant="ghost">
            <X size={18} />
          </Button>
        </header>
        <div>{children}</div>
        {footer && <footer className="modal-actions">{footer}</footer>}
      </section>
    </div>
  );
}
