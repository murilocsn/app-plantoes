import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type ActionTriggerProps = {
  "aria-controls": string;
  "aria-expanded": boolean;
  "data-actions-trigger": true;
  onClick: () => void;
};

type ActionsPopoverProps = {
  label: string;
  renderTrigger: (props: ActionTriggerProps) => ReactNode;
  children: ReactNode;
};

export function ActionsPopover({ label, renderTrigger, children }: ActionsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [below, setBelow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useLayoutEffect(() => {
    if (open && rootRef.current && panelRef.current) {
      setBelow(rootRef.current.getBoundingClientRect().top < panelRef.current.offsetHeight + 12);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dismiss = () => setOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) dismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
        rootRef.current?.querySelector<HTMLButtonElement>("[data-actions-trigger]")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("wheel", dismiss, { passive: true });
    document.addEventListener("touchmove", dismiss, { passive: true });
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("wheel", dismiss);
      document.removeEventListener("touchmove", dismiss);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  return (
    <div
      className={`row-action-popover${open ? " open" : ""}`}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      ref={rootRef}
    >
      {renderTrigger({
        "aria-controls": panelId,
        "aria-expanded": open,
        "data-actions-trigger": true,
        onClick: () => setOpen((value) => !value),
      })}
      <div
        aria-label={label}
        className={`row-action-panel${below ? " below" : ""}`}
        hidden={!open}
        id={panelId}
        onClick={(event) => {
          // Recolhe depois do clique da acao para nao interrompe-lo no Safari.
          if ((event.target as Element).closest("button")) {
            setOpen(false);
            rootRef.current?.querySelector<HTMLButtonElement>("[data-actions-trigger]")?.focus();
          }
        }}
        ref={panelRef}
        role="group"
      >
        {children}
      </div>
    </div>
  );
}
