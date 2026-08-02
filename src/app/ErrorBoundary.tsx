import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Never leave the learner on a silent blank screen. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Lỗi không bắt được:', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="centered-state">
        <div className="centered-state__icon" aria-hidden="true">
          ⚠️
        </div>
        <h1>Có lỗi khi tải ứng dụng</h1>
        <p>{error.message}</p>
        <button className="btn btn--primary" onClick={() => window.location.reload()}>
          Tải lại
        </button>
      </div>
    );
  }
}
