import type { ReactNode } from 'react';

export function LoadingScreen({ label = 'Đang tải...' }: { label?: string }) {
  return (
    <div className="centered-state" role="status" aria-live="polite">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="centered-state">
      {icon && (
        <div className="centered-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
