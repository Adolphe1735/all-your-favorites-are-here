export type AppErrorCode =
  | 'network'
  | 'timeout'
  | 'http'
  | 'parse'
  | 'playback'
  | 'runtime'
  | 'unknown';

export interface AppErrorInfo {
  title: string;
  message: string;
  detail?: string;
  status?: number;
  code: AppErrorCode;
  recoverable: boolean;
}

export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  readonly bodySnippet?: string;

  constructor(status: number, statusText: string, url: string, bodySnippet?: string) {
    super(bodySnippet || `HTTP ${status} ${statusText}`.trim());
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.bodySnippet = bodySnippet;
  }
}

function getHttpMessage(status: number, context?: string): { title: string; message: string } {
  const target = context ? `${context}` : 'The requested resource';
  if (status === 400) {
    return {
      title: 'Invalid request',
      message: `${target} could not be processed with the current filter or input.`,
    };
  }
  if (status === 401 || status === 403) {
    return {
      title: 'Access restricted',
      message: `${target} is temporarily restricted by the upstream provider.`,
    };
  }
  if (status === 404) {
    return {
      title: 'Resource not found',
      message: `${target} could not be found or is no longer available.`,
    };
  }
  if (status === 429) {
    return {
      title: 'Too many requests',
      message: `${target} is rate-limited right now. Wait a moment and retry.`,
    };
  }
  if (status >= 500) {
    return {
      title: 'Upstream service unavailable',
      message: `${target} returned a server error (${status}). Please retry in a moment.`,
    };
  }
  return {
    title: `Request error (${status})`,
    message: `${target} returned an unexpected HTTP ${status} response.`,
  };
}

export function normalizeError(err: unknown, context?: string): AppErrorInfo {
  const label = context || 'Data request';

  if (err instanceof HttpError) {
    const { title, message } = getHttpMessage(err.status, context);
    return {
      title,
      message,
      detail: err.bodySnippet ? `${err.status} ${err.statusText}: ${err.bodySnippet}` : `HTTP ${err.status} from ${err.url}`,
      status: err.status,
      code: 'http',
      recoverable: err.status >= 500 || err.status === 429 || err.status === 408 || err.status === 404,
    };
  }

  if (err instanceof DOMException && err.name === 'AbortError') {
    return {
      title: 'Request timed out',
      message: `${label} took too long to respond. Check your connection and try again.`,
      detail: err.message || 'AbortError',
      code: 'timeout',
      recoverable: true,
    };
  }

  if (err instanceof SyntaxError) {
    return {
      title: 'Invalid server response',
      message: `${label} returned malformed data instead of a valid JSON payload.`,
      detail: err.message,
      code: 'parse',
      recoverable: true,
    };
  }

  if (err instanceof TypeError) {
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return {
      title: isOffline ? 'You appear to be offline' : 'Network connection failed',
      message: isOffline
        ? `Reconnect to the internet to load ${label.toLowerCase()}.`
        : `Unable to reach ${label.toLowerCase()}. The server may be restarting or unreachable.`,
      detail: err.message,
      code: 'network',
      recoverable: true,
    };
  }

  if (err instanceof Error) {
    if (err.name === 'AbortError') {
      return {
        title: 'Request timed out',
        message: `${label} took too long to respond. Please try again.`,
        detail: err.message,
        code: 'timeout',
        recoverable: true,
      };
    }
    return {
      title: context ? `Unable to load ${context.toLowerCase()}` : 'Unexpected error',
      message: err.message || `An unexpected error occurred while loading ${label.toLowerCase()}.`,
      detail: err.stack ? err.stack.split('\n').slice(0, 2).join(' | ') : err.name,
      code: 'runtime',
      recoverable: true,
    };
  }

  return {
    title: 'Unexpected error',
    message: typeof err === 'string' && err.trim() ? err : `${label} failed unexpectedly.`,
    code: 'unknown',
    recoverable: true,
  };
}

export interface FetchCheckedOptions extends RequestInit {
  timeoutMs?: number;
  context?: string;
}

export async function fetchJsonChecked<T>(
  url: string,
  options: FetchCheckedOptions = {},
): Promise<T> {
  const { timeoutMs = 20000, context, signal: externalSignal, ...fetchInit } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException('Request aborted', 'AbortError');
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const res = await fetch(url, {
      ...fetchInit,
      signal: controller.signal,
    });

    if (!res.ok) {
      let bodySnippet: string | undefined;
      try {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const parsed = (await res.json()) as { error?: string; message?: string };
          bodySnippet = parsed.error || parsed.message;
        } else {
          const text = (await res.text()).trim();
          if (text) bodySnippet = text.slice(0, 180);
        }
      } catch {
        // Ignore error body parse failures and rely on status metadata
      }
      throw new HttpError(res.status, res.statusText, url, bodySnippet);
    }

    const rawText = await res.text();
    if (!rawText.trim()) {
      throw new SyntaxError(`Empty response received from ${context || url}`);
    }
    return JSON.parse(rawText) as T;
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export function formatErrorForReport(err: AppErrorInfo): string {
  const parts = [`Title: ${err.title}`, `Code: ${err.code}`, `Message: ${err.message}`];
  if (typeof err.status === 'number') parts.push(`HTTP Status: ${err.status}`);
  if (err.detail) parts.push(`Detail: ${err.detail}`);
  return parts.join('\n');
}
