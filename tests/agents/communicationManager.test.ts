import { describe, it, expect } from 'vitest';
import { AgentCommunicationManager } from '../../src/agents/AgentCommunicationManager';


describe('AgentCommunicationManager', () => {
  it('serializes calls for the same agent', async () => {
    const manager = new AgentCommunicationManager();
    const order: string[] = [];

    const task = (id: string) => manager.executeWithLock('A', async () => {
      order.push(id + 'start');
      await new Promise(r => setTimeout(r, 10));
      order.push(id + 'end');
    });

    await Promise.all([task('1'), task('2')]);
    expect(order).toEqual(['1start', '1end', '2start', '2end']);
  });
});
