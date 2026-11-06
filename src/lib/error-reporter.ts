const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80';

function getClientAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromStorage = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (fromStorage) return fromStorage;
  } catch {}
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )(?:access_token|token)=([^;]*)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

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
    const token = getClientAuthToken();
    if (!token) {
      // Bỏ qua nếu chưa đăng nhập để không gây lỗi 401 trên Gateway
      return;
    }

    await fetch(`${API_BASE}/errors/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
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
