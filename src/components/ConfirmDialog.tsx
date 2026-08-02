import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Native <dialog>, so focus trapping, Escape and the backdrop come from the
 * platform rather than from hand-rolled key handling.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Huỷ',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="card"
      style={{ maxWidth: '26rem', color: 'var(--text)' }}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2>{title}</h2>
      <p style={{ margin: 'var(--sp-3) 0 var(--sp-5)', color: 'var(--text-dim)' }}>{description}</p>
      <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end' }}>
        <button className="btn btn--secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          className={destructive ? 'btn btn--danger' : 'btn btn--primary'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
