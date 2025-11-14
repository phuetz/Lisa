/**
 * Tests for agent analytics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentAnalytics } from '../agentAnalytics';
import { mockLocalStorage, wait } from './testHelpers';

describe('AgentAnalytics', () => {
  let analytics: AgentAnalytics;

  beforeEach(() => {
    mockLocalStorage();
    analytics = new AgentAnalytics({ enableLogging: false });
  });

  describe('recordExecution', () => {
    it('should record successful execution', () => {
      analytics.recordExecution({
        agentName: 'TestAgent',
        timestamp: Date.now(),
        duration: 100,
        success: true,
      });

      const metrics = analytics.getMetrics('TestAgent');
      expect(metrics).toBeDefined();
      expect(metrics!.totalExecutions).toBe(1);
      expect(metrics!.successCount).toBe(1);
      expect(metrics!.failureCount).toBe(0);
    });

    it('should record failed execution', () => {
      analytics.recordExecution({
        agentName: 'TestAgent',
        timestamp: Date.now(),
        duration: 50,
        success: false,
        error: 'Test error',
      });

      const metrics = analytics.getMetrics('TestAgent');
      expect(metrics!.totalExecutions).toBe(1);
      expect(metrics!.successCount).toBe(0);
      expect(metrics!.failureCount).toBe(1);
      expect(metrics!.lastError).toBe('Test error');
    });

    it('should track multiple executions', () => {
      for (let i = 0; i < 10; i++) {
        analytics.recordExecution({
          agentName: 'TestAgent',
          timestamp: Date.now(),
          duration: 100 + i * 10,
          success: true,
        });
      }

      const metrics = analytics.getMetrics('TestAgent');
      expect(metrics!.totalExecutions).toBe(10);
      expect(metrics!.averageExecutionTime).toBeGreaterThan(100);
    });
  });

  describe('trackExecution', () => {
    it('should track successful execution', async () => {
      const fn = vi.fn().mockResolvedValue('result');

      const result = await analytics.trackExecution('TestAgent', fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();

      const metrics = analytics.getMetrics('TestAgent');
      expect(metrics!.totalExecutions).toBe(1);
      expect(metrics!.successCount).toBe(1);
    });

    it('should track failed execution', async () => {
      const error = new Error('Test error');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(analytics.trackExecution('TestAgent', fn)).rejects.toThrow(
        'Test error'
      );

      const metrics = analytics.getMetrics('TestAgent');
      expect(metrics!.totalExecutions).toBe(1);
      expect(metrics!.failureCount).toBe(1);
      expect(metrics!.lastError).toBe('Test error');
    });

    it('should measure execution time', async () => {
      const fn = vi.fn().mockImplementation(async () => {
        await wait(50);
        return 'result';
      });

      await analytics.trackExecution('TestAgent', fn);

      const metrics = analytics.getMetrics('TestAgent');
      expect(metrics!.averageExecutionTime).toBeGreaterThanOrEqual(50);
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      // Record some test data
      for (let i = 0; i < 100; i++) {
        analytics.recordExecution({
          agentName: 'TestAgent',
          timestamp: Date.now(),
          duration: Math.random() * 200,
          success: i % 10 !== 0, // 90% success rate
        });
      }
    });

    it('should calculate average execution time', () => {
      const metrics = analytics.getMetrics('TestAgent');
      expect(metrics!.averageExecutionTime).toBeGreaterThan(0);
      expect(metrics!.averageExecutionTime).toBeLessThan(200);
    });

    it('should calculate min and max', () => {
      const metrics = analytics.getMetrics('TestAgent');
      expect(metrics!.minExecutionTime).toBeGreaterThanOrEqual(0);
      expect(metrics!.maxExecutionTime).toBeLessThanOrEqual(200);
      expect(metrics!.minExecutionTime).toBeLessThan(metrics!.maxExecutionTime);
    });

    it('should calculate percentiles', () => {
      const metrics = analytics.getMetrics('TestAgent');
      expect(metrics!.p50).toBeGreaterThan(0);
      expect(metrics!.p95).toBeGreaterThan(metrics!.p50);
      expect(metrics!.p99).toBeGreaterThanOrEqual(metrics!.p95);
    });

    it('should calculate error rate', () => {
      const metrics = analytics.getMetrics('TestAgent');
      expect(metrics!.errorRate).toBeCloseTo(0.1, 1); // ~10% error rate
    });

    it('should track throughput', () => {
      const metrics = analytics.getMetrics('TestAgent');
      expect(metrics!.throughput).toBeGreaterThan(0);
    });
  });

  describe('getAllMetrics', () => {
    beforeEach(() => {
      analytics.recordExecution({
        agentName: 'Agent1',
        timestamp: Date.now(),
        duration: 100,
        success: true,
      });

      analytics.recordExecution({
        agentName: 'Agent2',
        timestamp: Date.now(),
        duration: 200,
        success: true,
      });
    });

    it('should return metrics for all agents', () => {
      const allMetrics = analytics.getAllMetrics();
      expect(allMetrics).toHaveLength(2);
      expect(allMetrics.some(m => m.agentName === 'Agent1')).toBe(true);
      expect(allMetrics.some(m => m.agentName === 'Agent2')).toBe(true);
    });

    it('should sort by average execution time', () => {
      const allMetrics = analytics.getAllMetrics();
      expect(allMetrics[0].averageExecutionTime).toBeGreaterThanOrEqual(
        allMetrics[1].averageExecutionTime
      );
    });
  });

  describe('getTopPerformers', () => {
    beforeEach(() => {
      // Agent with high success rate
      for (let i = 0; i < 10; i++) {
        analytics.recordExecution({
          agentName: 'GoodAgent',
          timestamp: Date.now(),
          duration: 100,
          success: true,
        });
      }

      // Agent with low success rate
      for (let i = 0; i < 10; i++) {
        analytics.recordExecution({
          agentName: 'BadAgent',
          timestamp: Date.now(),
          duration: 100,
          success: i < 3, // 30% success rate
        });
      }
    });

    it('should return top performing agents', () => {
      const top = analytics.getTopPerformers(5);
      expect(top[0].agentName).toBe('GoodAgent');
      expect(top[0].errorRate).toBe(0);
    });

    it('should require minimum executions', () => {
      analytics.recordExecution({
        agentName: 'NewAgent',
        timestamp: Date.now(),
        duration: 50,
        success: true,
      });

      const top = analytics.getTopPerformers(5);
      expect(top.some(m => m.agentName === 'NewAgent')).toBe(false);
    });
  });

  describe('getSlowestAgents', () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        analytics.recordExecution({
          agentName: 'FastAgent',
          timestamp: Date.now(),
          duration: 50,
          success: true,
        });

        analytics.recordExecution({
          agentName: 'SlowAgent',
          timestamp: Date.now(),
          duration: 500,
          success: true,
        });
      }
    });

    it('should return slowest agents', () => {
      const slowest = analytics.getSlowestAgents(5);
      expect(slowest[0].agentName).toBe('SlowAgent');
      expect(slowest[0].averageExecutionTime).toBeGreaterThan(
        slowest[slowest.length - 1].averageExecutionTime
      );
    });
  });

  describe('getMostProblematic', () => {
    beforeEach(() => {
      // Problematic agent
      for (let i = 0; i < 10; i++) {
        analytics.recordExecution({
          agentName: 'ProblematicAgent',
          timestamp: Date.now(),
          duration: 100,
          success: i < 2, // 20% success rate
        });
      }

      // Reliable agent
      for (let i = 0; i < 10; i++) {
        analytics.recordExecution({
          agentName: 'ReliableAgent',
          timestamp: Date.now(),
          duration: 100,
          success: true,
        });
      }
    });

    it('should return most problematic agents', () => {
      const problematic = analytics.getMostProblematic(5);
      expect(problematic[0].agentName).toBe('ProblematicAgent');
      expect(problematic[0].errorRate).toBeGreaterThan(0.5);
    });
  });

  describe('getSummary', () => {
    beforeEach(() => {
      for (let i = 0; i < 20; i++) {
        analytics.recordExecution({
          agentName: `Agent${i % 3}`,
          timestamp: Date.now(),
          duration: 100,
          success: i % 5 !== 0, // 80% success rate
        });
      }
    });

    it('should return summary statistics', () => {
      const summary = analytics.getSummary();
      expect(summary.totalAgents).toBeGreaterThan(0);
      expect(summary.totalExecutions).toBe(20);
      expect(summary.overallSuccessRate).toBeCloseTo(0.8, 1);
      expect(summary.averageExecutionTime).toBeGreaterThan(0);
      expect(summary.topAgent).toBeDefined();
    });
  });

  describe('getPercentiles', () => {
    beforeEach(() => {
      for (let i = 0; i < 100; i++) {
        analytics.recordExecution({
          agentName: 'TestAgent',
          timestamp: Date.now(),
          duration: i,
          success: true,
        });
      }
    });

    it('should calculate percentiles correctly', () => {
      const percentiles = analytics.getPercentiles('TestAgent');
      expect(percentiles).toBeDefined();
      expect(percentiles!.p50).toBeCloseTo(50, 5);
      expect(percentiles!.p95).toBeCloseTo(95, 5);
      expect(percentiles!.p99).toBeCloseTo(99, 5);
    });

    it('should return null for unknown agent', () => {
      const percentiles = analytics.getPercentiles('UnknownAgent');
      expect(percentiles).toBeNull();
    });
  });

  describe('persistence', () => {
    it('should persist to localStorage', () => {
      const analytics = new AgentAnalytics({
        persistToStorage: true,
        enableLogging: false,
      });

      analytics.recordExecution({
        agentName: 'TestAgent',
        timestamp: Date.now(),
        duration: 100,
        success: true,
      });

      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should load from localStorage', () => {
      localStorage.setItem(
        'lisa_agent_analytics',
        JSON.stringify({
          records: [
            {
              agentName: 'TestAgent',
              timestamp: Date.now(),
              duration: 100,
              success: true,
            },
          ],
          exportedAt: Date.now(),
        })
      );

      const analytics = new AgentAnalytics({
        persistToStorage: true,
        enableLogging: false,
      });

      const metrics = analytics.getMetrics('TestAgent');
      expect(metrics).toBeDefined();
      expect(metrics!.totalExecutions).toBe(1);
    });
  });

  describe('export/import', () => {
    beforeEach(() => {
      analytics.recordExecution({
        agentName: 'TestAgent',
        timestamp: Date.now(),
        duration: 100,
        success: true,
      });
    });

    it('should export data', () => {
      const exported = analytics.export();
      expect(exported).toBeTruthy();
      const parsed = JSON.parse(exported);
      expect(parsed.records).toBeDefined();
      expect(parsed.exportedAt).toBeDefined();
    });

    it('should import data', () => {
      const exported = analytics.export();
      analytics.clear();

      expect(analytics.getAllMetrics()).toHaveLength(0);

      analytics.import(exported);
      expect(analytics.getAllMetrics()).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      analytics.recordExecution({
        agentName: 'TestAgent',
        timestamp: Date.now(),
        duration: 100,
        success: true,
      });

      expect(analytics.getAllMetrics()).toHaveLength(1);

      analytics.clear();
      expect(analytics.getAllMetrics()).toHaveLength(0);
    });
  });
});
