/**
 * Tests for Enhanced Agent Registry
 * IT-020: Refactoriser AgentRegistry (Lot 2)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  agentCategories,
  getAgentCategory,
  getAllAgentNames,
  getAgentsByDomain,
  recordAgentUsage,
  getLeastRecentlyUsedAgents,
  getAgentMemoryStats,
  getLoadedAgentStats,
} from '../registryEnhanced';
import { agentRegistry } from '../registry';

// Mock the registry
vi.mock('../registry', () => ({
  agentRegistry: {
    getAllAgents: vi.fn(() => []),
    listAvailableAgentNames: vi.fn(() => [
      'NLUAgent', 'PlannerAgent', 'MemoryAgent', 'VisionAgent'
    ]),
    getAgentAsync: vi.fn(),
    execute: vi.fn(),
  },
}));

describe('registryEnhanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('agentCategories', () => {
    it('should have core agents defined', () => {
      expect(agentCategories.core).toContain('NLUAgent');
      expect(agentCategories.core).toContain('PlannerAgent');
      expect(agentCategories.core).toContain('MemoryAgent');
      expect(agentCategories.core).toContain('CoordinatorAgent');
    });

    it('should have vision agents defined', () => {
      expect(agentCategories.vision).toContain('VisionAgent');
      expect(agentCategories.vision).toContain('ImageAnalysisAgent');
      expect(agentCategories.vision).toContain('OCRAgent');
    });

    it('should have audio agents defined', () => {
      expect(agentCategories.audio).toContain('HearingAgent');
      expect(agentCategories.audio).toContain('AudioAnalysisAgent');
      expect(agentCategories.audio).toContain('SpeechSynthesisAgent');
    });

    it('should have workflow agents defined', () => {
      expect(agentCategories.workflow).toContain('ConditionAgent');
      expect(agentCategories.workflow).toContain('ForEachAgent');
      expect(agentCategories.workflow).toContain('TransformAgent');
    });

    it('should have all 13 categories', () => {
      const categories = Object.keys(agentCategories);
      expect(categories).toHaveLength(13);
      expect(categories).toContain('core');
      expect(categories).toContain('vision');
      expect(categories).toContain('audio');
      expect(categories).toContain('workflow');
      expect(categories).toContain('development');
      expect(categories).toContain('communication');
      expect(categories).toContain('analysis');
      expect(categories).toContain('iot');
      expect(categories).toContain('utility');
      expect(categories).toContain('security');
      expect(categories).toContain('health');
      expect(categories).toContain('aiCli');
      expect(categories).toContain('specialized');
    });
  });

  describe('getAgentCategory', () => {
    it('should return correct category for core agent', () => {
      expect(getAgentCategory('NLUAgent')).toBe('core');
      expect(getAgentCategory('PlannerAgent')).toBe('core');
    });

    it('should return correct category for vision agent', () => {
      expect(getAgentCategory('VisionAgent')).toBe('vision');
      expect(getAgentCategory('OCRAgent')).toBe('vision');
    });

    it('should return correct category for workflow agent', () => {
      expect(getAgentCategory('ConditionAgent')).toBe('workflow');
      expect(getAgentCategory('ForEachAgent')).toBe('workflow');
    });

    it('should return undefined for unknown agent', () => {
      expect(getAgentCategory('UnknownAgent')).toBeUndefined();
    });
  });

  describe('getAllAgentNames', () => {
    it('should return all agent names as flat array', () => {
      const names = getAllAgentNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(50); // We have 50+ agents
      expect(names).toContain('NLUAgent');
      expect(names).toContain('VisionAgent');
      expect(names).toContain('WorkflowHTTPAgent');
    });

    it('should not have duplicates', () => {
      const names = getAllAgentNames();
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('getAgentsByDomain', () => {
    it('should return vision agents for vision domain', () => {
      const agents = getAgentsByDomain('vision');
      expect(agents).toContain('VisionAgent');
      expect(agents).toContain('ImageAnalysisAgent');
    });

    it('should return audio agents for audio domain', () => {
      const agents = getAgentsByDomain('audio');
      expect(agents).toContain('HearingAgent');
      expect(agents).toContain('AudioAnalysisAgent');
    });

    it('should return workflow agents for workflow domain', () => {
      const agents = getAgentsByDomain('workflow');
      expect(agents).toContain('ConditionAgent');
      expect(agents).toContain('ForEachAgent');
    });

    it('should return empty array for unknown domain', () => {
      const agents = getAgentsByDomain('unknown' as any);
      expect(agents).toEqual([]);
    });
  });

  describe('recordAgentUsage and getLeastRecentlyUsedAgents', () => {
    it('should track agent usage timestamps', () => {
      // Mock loaded agents
      vi.mocked(agentRegistry.getAllAgents).mockReturnValue([
        { name: 'AgentA' } as any,
        { name: 'AgentB' } as any,
        { name: 'AgentC' } as any,
      ]);

      // Record usage with delays
      recordAgentUsage('AgentA');
      recordAgentUsage('AgentC');
      recordAgentUsage('AgentB');

      // AgentA should be LRU (used first)
      const lru = getLeastRecentlyUsedAgents(2);
      expect(lru).toHaveLength(2);
      expect(lru[0]).toBe('AgentA'); // Oldest usage
    });

    it('should not include core agents in LRU list', () => {
      vi.mocked(agentRegistry.getAllAgents).mockReturnValue([
        { name: 'NLUAgent' } as any, // Core agent
        { name: 'VisionAgent' } as any,
      ]);

      const lru = getLeastRecentlyUsedAgents(10);
      expect(lru).not.toContain('NLUAgent');
    });
  });

  describe('getAgentMemoryStats', () => {
    it('should return correct stats', () => {
      vi.mocked(agentRegistry.getAllAgents).mockReturnValue([
        { name: 'NLUAgent' } as any,
        { name: 'VisionAgent' } as any,
      ]);
      vi.mocked(agentRegistry.listAvailableAgentNames).mockReturnValue([
        'NLUAgent', 'PlannerAgent', 'VisionAgent', 'AudioAgent'
      ]);

      const stats = getAgentMemoryStats();

      expect(stats.loadedCount).toBe(2);
      expect(stats.availableCount).toBe(4);
      expect(stats.coreLoadedCount).toBe(1); // NLUAgent is core
    });
  });

  describe('getLoadedAgentStats', () => {
    it('should return stats by category', () => {
      vi.mocked(agentRegistry.getAllAgents).mockReturnValue([
        { name: 'NLUAgent' } as any,
        { name: 'PlannerAgent' } as any,
        { name: 'VisionAgent' } as any,
      ]);

      const stats = getLoadedAgentStats();

      expect(stats.core.loaded).toBe(2); // NLUAgent, PlannerAgent
      expect(stats.core.total).toBe(4);
      expect(stats.vision.loaded).toBe(1); // VisionAgent
      expect(stats.vision.total).toBe(3);
    });
  });
});
