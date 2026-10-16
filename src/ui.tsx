import { useEffect, useRef, useState, type ReactNode } from 'react';
import { goBack } from './router';

export function Header({ title, back, actions }: { title: ReactNode; back?: boolean; actions?: ReactNode }) {
  return (
    <header className="header">
      {back && (
        <button className="icon-btn" onClick={goBack} aria-label="חזרה">
          →
        </button>
      )}
      <h1>{title}</h1>
      <div className="header-actions">{actions}</div>
    </header>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Modal with a single text field, replacing window.prompt. */
export function PromptModal({
  title, initial = '', placeholder, confirmLabel = 'שמירה', onSubmit, onClose,
}: {
  title: string;
  initial?: string;
  placeholder?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim()) return;
          onSubmit(value.trim());
          onClose();
        }}
      >
        <input ref={ref} value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} />
        <div className="row-buttons">
          <button type="button" className="btn ghost" onClick={onClose}>ביטול</button>
          <button type="submit" className="btn primary" disabled={!value.trim()}>{confirmLabel}</button>
        </div>
      </form>
    </Modal>
  );
}

export function Loading() {
  return <div className="center muted">טוען…</div>;
}
