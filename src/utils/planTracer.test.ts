/**
 * Tests for the planTracer utility
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { planTracer } from './planTracer';

describe('planTracer', () => {
  beforeEach(() => {
    // Réinitialiser les traces entre chaque test
    planTracer.cleanup();
  });

  it('should create a new trace with ID', () => {
    const requestId = 'Check the weather for Paris';
    const traceId = planTracer.startTrace(requestId);
    
    expect(traceId).toBeDefined();
    expect(typeof traceId).toBe('string');
    
    const trace = planTracer.getTrace(traceId);
    expect(trace).toBeDefined();
    expect(trace?.requestId).toBe(requestId);
    expect(trace?.steps).toEqual([]);
  });

  it('should add steps to an existing trace', () => {
    const traceId = planTracer.startTrace('Test request');
    
    planTracer.addStep(traceId, 'plan_generation', {
      metadata: { source: 'test' }
    });
    
    planTracer.addStep(traceId, 'plan_execution', {
      result: { success: true }
    });
    
    const trace = planTracer.getTrace(traceId);
    expect(trace?.steps.length).toBe(2);
    expect(trace?.steps[0].operation).toBe('plan_generation');
    expect(trace?.steps[1].operation).toBe('plan_execution');
    expect(trace?.steps[0].details.metadata).toEqual({ source: 'test' });
    expect(trace?.steps[1].details.result).toEqual({ success: true });
  });

  it('should end a trace with summary', () => {
    const traceId = planTracer.startTrace('Test request');
    const summary = 'Completed successfully';
    
    planTracer.endTrace(traceId, summary);
    
    const trace = planTracer.getTrace(traceId);
    expect(trace?.endTime).toBeDefined();
    expect(trace?.summary).toBe(summary);
  });

  it('should retrieve recent traces with limit', () => {
    // Créer plusieurs traces
    const traceId1 = planTracer.startTrace('Request 1');
    planTracer.endTrace(traceId1, 'Done 1');
    
    const traceId2 = planTracer.startTrace('Request 2');
    planTracer.endTrace(traceId2, 'Done 2');
    
    const traceId3 = planTracer.startTrace('Request 3');
    planTracer.endTrace(traceId3, 'Done 3');
    
    // Récupérer avec limite
    const traces = planTracer.getRecentTraces(2);
    expect(traces.length).toBe(2);
    // Vérifier que les traces retournées sont parmi celles créées
    const requestIds = traces.map(t => t.requestId);
    expect(requestIds.every(id => ['Request 1', 'Request 2', 'Request 3'].includes(id))).toBe(true);
  });

  it('should delete a trace', () => {
    const traceId = planTracer.startTrace('Delete me');
    expect(planTracer.getTrace(traceId)).toBeDefined();
    
    const deleted = planTracer.deleteTrace(traceId);
    expect(deleted).toBe(true);
    expect(planTracer.getTrace(traceId)).toBeNull();
  });

  it('should handle invalid trace IDs gracefully', () => {
    expect(() => planTracer.addStep('invalid-id', 'plan_generation', {}))
      .not.toThrow();
    
    expect(planTracer.getTrace('invalid-id')).toBeNull();
    expect(planTracer.deleteTrace('invalid-id')).toBe(false);
  });

  it('should clean up old traces', () => {
    // Simuler le temps qui passe pour certaines traces
    const realDateNow = Date.now;
    
    try {
      // Créer de vieilles traces (simulées comme étant d'il y a plus d'une heure)
      Date.now = vi.fn().mockReturnValue(realDateNow() - 3600001);
      const oldTraceId = planTracer.startTrace('Old trace');
      planTracer.endTrace(oldTraceId, 'Done old');
      
      // Réinitialiser à l'heure actuelle pour créer des traces récentes
      Date.now = vi.fn().mockReturnValue(realDateNow());
      const newTraceId = planTracer.startTrace('New trace');
      planTracer.endTrace(newTraceId, 'Done new');
      
      // Nettoyer les traces de plus d'une heure
      const cleaned = planTracer.cleanup(3600000);
      
      // Vérifier que la vieille trace est supprimée mais pas la nouvelle
      expect(cleaned).toBe(1);
      expect(planTracer.getTrace(oldTraceId)).toBeNull();
      expect(planTracer.getTrace(newTraceId)).not.toBeNull();
    } finally {
      // Restaurer la fonction Date.now
      Date.now = realDateNow;
    }
  });
});
