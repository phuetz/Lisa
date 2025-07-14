export class AgentCommunicationManager {
  private locks: Map<string, Promise<void>> = new Map();

  async executeWithLock<T>(agentName: string, fn: () => Promise<T>): Promise<T> {
    while (this.locks.has(agentName)) {
      await this.locks.get(agentName);
    }

    let release: () => void;
    const lockPromise = new Promise<void>(resolve => {
      release = resolve;
    });

    this.locks.set(agentName, lockPromise);

    try {
      return await fn();
    } finally {
      this.locks.delete(agentName);
      release!();
    }
  }
}

export const agentCommunicationManager = new AgentCommunicationManager();
