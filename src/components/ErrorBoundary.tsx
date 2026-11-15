import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Check, Copy, Home, RefreshCw } from 'lucide-react';
import { formatErrorForReport, normalizeError, type AppErrorInfo } from '../utils/errors';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  resetKey?: string | number;
  onReset?: () => void;
  onGoHome?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: AppErrorInfo | null;
  stackPreview?: string;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorInfo: null,
    stackPreview: undefined,
    copied: false,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorInfo: normalizeError(error, 'interface'),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const stackLines = (info.componentStack || error.stack || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6)
      .join('\n');

    this.setState({
      stackPreview: stackLines || undefined,
    });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({
        hasError: false,
        errorInfo: null,
        stackPreview: undefined,
        copied: false,
      });
    }
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      errorInfo: null,
      stackPreview: undefined,
      copied: false,
    });
    this.props.onReset?.();
  };

  private handleCopyDiagnostics = (): void => {
    if (!this.state.errorInfo) return;
    const report = [
      formatErrorForReport(this.state.errorInfo),
      this.state.stackPreview ? `\nComponent Trace:\n${this.state.stackPreview}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(report)
        .then(() => {
          this.setState({ copied: true });
          setTimeout(() => this.setState({ copied: false }), 2000);
        })
        .catch(() => {});
    }
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const title = this.props.fallbackTitle || 'Unable to render this section';
    const message =
      this.state.errorInfo?.message || 'An unexpected rendering issue occurred.';

    return (
      <div
        role="alert"
        className="my-6 rounded-2xl border border-red-500/35 dark:border-red-400/35 bg-[var(--sm-surface)] p-6 sm:p-10 text-center space-y-5 max-w-2xl mx-auto"
      >
        <div className="w-12 h-12 mx-auto rounded-full border border-red-500/30 bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
          <AlertTriangle size={22} aria-hidden="true" />
        </div>

        <div className="space-y-1.5">
          <h2 className="font-display text-xl font-bold text-[var(--sm-text)]">{title}</h2>
          <p className="text-xs sm:text-sm text-[var(--sm-text-sec)] leading-relaxed">{message}</p>
        </div>

        {this.state.stackPreview && (
          <pre className="text-left text-[11px] font-mono text-[var(--sm-text-muted)] bg-[var(--sm-bg)] border border-[var(--sm-border)] rounded-lg p-3 overflow-x-auto max-h-40">
            {this.state.stackPreview}
          </pre>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[var(--sm-accent)] text-[var(--sm-on-accent)] text-xs font-semibold hover:opacity-90 whitespace-nowrap"
          >
            <RefreshCw size={13} />
            <span>Try Again</span>
          </button>

          {this.props.onGoHome && (
            <button
              type="button"
              onClick={() => {
                this.handleRetry();
                this.props.onGoHome?.();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-bg)] text-xs font-medium text-[var(--sm-text)] hover:border-[var(--sm-accent)] whitespace-nowrap"
            >
              <Home size={13} />
              <span>Return to Discover</span>
            </button>
          )}

          <button
            type="button"
            onClick={this.handleCopyDiagnostics}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--sm-border)] text-xs font-medium text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] whitespace-nowrap"
          >
            {this.state.copied ? (
              <>
                <Check size={13} className="text-emerald-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy Diagnostics</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
}
