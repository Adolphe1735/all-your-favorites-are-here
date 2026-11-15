import { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Home,
  RefreshCw,
  ServerCrash,
  WifiOff,
  X,
} from 'lucide-react';
import type { AppErrorInfo } from '../utils/errors';

interface ErrorNoticeProps {
  error: AppErrorInfo | string | null;
  variant?: 'card' | 'banner';
  onRetry?: () => void;
  onDismiss?: () => void;
  onGoHome?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorNotice({
  error,
  variant = 'card',
  onRetry,
  onDismiss,
  onGoHome,
  retryLabel = 'Try Again',
  className = '',
}: ErrorNoticeProps) {
  const [showDetail, setShowDetail] = useState(false);

  if (!error) return null;

  const info: AppErrorInfo =
    typeof error === 'string'
      ? {
          title: 'Something went wrong',
          message: error,
          code: 'unknown',
          recoverable: true,
        }
      : error;

  const Icon =
    info.code === 'network' ? WifiOff : info.code === 'http' ? ServerCrash : AlertTriangle;

  if (variant === 'banner') {
    return (
      <div
        role="alert"
        className={`rounded-xl border border-red-500/35 dark:border-red-400/35 bg-[var(--sm-surface)] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <Icon
            size={16}
            className="text-red-600 dark:text-red-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-0.5">
            <div className="text-xs font-semibold text-[var(--sm-text)]">{info.title}</div>
            <p className="text-xs text-[var(--sm-text-sec)] leading-relaxed">{info.message}</p>
            {info.detail && showDetail && (
              <p className="text-[11px] font-mono text-[var(--sm-text-muted)] break-all pt-1">
                {info.detail}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {info.detail && (
            <button
              type="button"
              onClick={() => setShowDetail((v) => !v)}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--sm-border)] text-[11px] font-medium text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] whitespace-nowrap"
            >
              {showDetail ? 'Hide info' : 'Details'}
            </button>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--sm-accent)] text-[var(--sm-on-accent)] text-xs font-semibold hover:opacity-90 whitespace-nowrap"
            >
              <RefreshCw size={12} />
              <span>{retryLabel}</span>
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss error"
              className="p-1.5 rounded-lg text-[var(--sm-text-muted)] hover:text-[var(--sm-text)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={`rounded-xl border border-red-500/35 dark:border-red-400/35 bg-[var(--sm-surface)] p-6 sm:p-8 text-center space-y-4 ${className}`}
    >
      <div className="w-11 h-11 mx-auto rounded-full border border-red-500/30 bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
        <Icon size={20} aria-hidden="true" />
      </div>

      <div className="space-y-1.5 max-w-lg mx-auto">
        <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--sm-text)]">
          {info.title}
        </h2>
        <p className="text-xs sm:text-sm text-[var(--sm-text-sec)] leading-relaxed">
          {info.message}
        </p>
      </div>

      {info.detail && (
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--sm-text-muted)] hover:text-[var(--sm-text)]"
          >
            <span>Technical details</span>
            {showDetail ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showDetail && (
            <div className="mt-2 p-3 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-bg)] text-left text-[11px] font-mono text-[var(--sm-text-sec)] break-all">
              {info.detail}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[var(--sm-accent)] text-[var(--sm-on-accent)] text-xs font-semibold hover:opacity-90 whitespace-nowrap"
          >
            <RefreshCw size={13} />
            <span>{retryLabel}</span>
          </button>
        )}
        {onGoHome && (
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--sm-border)] bg-[var(--sm-bg)] text-xs font-medium text-[var(--sm-text)] hover:border-[var(--sm-accent)] whitespace-nowrap"
          >
            <Home size={13} />
            <span>Return Home</span>
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="px-4 py-2 rounded-lg border border-[var(--sm-border)] text-xs font-medium text-[var(--sm-text-sec)] hover:text-[var(--sm-text)] whitespace-nowrap"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
