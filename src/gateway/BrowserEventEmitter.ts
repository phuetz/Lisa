/**
 * Browser-compatible EventEmitter
 * Replaces Node.js EventEmitter for client-side code
 */

type EventHandler = (...args: unknown[]) => void;

export class BrowserEventEmitter {
  private events: Map<string, EventHandler[]> = new Map();

  private ensureEventsMap(): void {
    if (!(this.events instanceof Map)) {
      this.events = new Map();
    }
  }

  on(event: string, handler: EventHandler): this {
    this.ensureEventsMap();
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
    return this;
  }

  off(event: string, handler: EventHandler): this {
    this.ensureEventsMap();
    const handlers = this.events.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    this.ensureEventsMap();
    const handlers = this.events.get(event);
    if (handlers && handlers.length > 0) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (e) {
          console.error(`Error in event handler for ${event}:`, e);
        }
      });
      return true;
    }
    return false;
  }

  removeAllListeners(event?: string): this {
    this.ensureEventsMap();
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  listenerCount(event: string): number {
    this.ensureEventsMap();
    return this.events.get(event)?.length || 0;
  }
}

