type Listener = (...args: any[]) => void;

class EventBus {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, fn: Listener): () => void {
    (this.listeners[event] ??= []).push(fn);
    return () => this.off(event, fn);
  }

  off(event: string, fn: Listener): void {
    const list = this.listeners[event];
    if (list) this.listeners[event] = list.filter(l => l !== fn);
  }

  emit(event: string, ...args: any[]): void {
    this.listeners[event]?.forEach(fn => fn(...args));
  }
}

export const bus = new EventBus();
