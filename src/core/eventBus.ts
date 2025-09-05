type Listener = (payload?: any) => void;

class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const set = this.listeners.get(event)!;
    set.add(listener);
    return () => set.delete(listener);
  }

  emit(event: string, payload?: any): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((l) => {
      try { l(payload); } catch {}
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();


