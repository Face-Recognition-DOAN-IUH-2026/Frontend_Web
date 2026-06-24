const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80';

interface ReportErrorParams {
  title: string;
  description?: string;
  priority?: 'Highest' | 'High' | 'Medium' | 'Low';
  labels?: string[];
  service?: string;
  endpoint?: string;
  method?: string;
  stacktrace?: string;
  requestBody?: string;
}

export async function reportError(params: ReportErrorParams): Promise<void> {
  try {
    await fetch(`${API_BASE}/errors/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        service: params.service || 'frontend-web',
      }),
    });
  } catch {
    // Silent fail — error reporting should never break the app
  }
}

// Global error handler for unhandled errors
export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    reportError({
      title: `[Frontend-Web] Uncaught Error - ${event.message}`,
      description: event.message,
      priority: 'High',
      labels: ['frontend-web', 'uncaught-error'],
      stacktrace: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    reportError({
      title: `[Frontend-Web] Unhandled Promise Rejection - ${message}`,
      description: message,
      priority: 'High',
      labels: ['frontend-web', 'unhandled-rejection'],
      stacktrace: stack,
    });
  });
}
