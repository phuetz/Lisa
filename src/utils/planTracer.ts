/**
 * planTracer.ts
 * 
 * Système de traçage pour les opérations de planification et d'exécution
 * Permet de capturer les étapes, prompts, et résultats pour le débogage et l'affichage dans l'UI
 */

export interface TraceStep {
  id: string;
  timestamp: number;
  operation: 'plan_generation' | 'plan_execution' | 'plan_revision' | 'checkpoint' | 'template_operation';
  details: {
    prompt?: string;
    result?: unknown;
    error?: string;
    metadata?: Record<string, unknown>;
    explanation?: string;
  };
}

export interface PlanTrace {
  id: string;
  requestId: string;
  startTime: number;
  endTime?: number;
  steps: TraceStep[];
  summary?: string;
}

class PlanTracer {
  private traces: Map<string, PlanTrace> = new Map();
  
  /**
   * Crée une nouvelle trace pour une requête de planification
   */
  startTrace(requestId: string): string {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    this.traces.set(traceId, {
      id: traceId,
      requestId,
      startTime: Date.now(),
      steps: []
    });
    
    return traceId;
  }
  
  /**
   * Ajoute une étape à une trace existante
   */
  addStep(traceId: string, operation: TraceStep['operation'], details: Partial<TraceStep['details']>): void {
    const trace = this.traces.get(traceId);
    if (!trace) {
      console.warn(`Trace ${traceId} not found`);
      return;
    }
    
    const stepId = `step_${trace.steps.length + 1}_${Date.now()}`;
    
    trace.steps.push({
      id: stepId,
      timestamp: Date.now(),
      operation,
      details: {
        ...details
      }
    });
  }
  
  /**
   * Termine une trace et ajoute un résumé
   */
  endTrace(traceId: string, summary?: string): PlanTrace | null {
    const trace = this.traces.get(traceId);
    if (!trace) {
      console.warn(`Trace ${traceId} not found`);
      return null;
    }
    
    trace.endTime = Date.now();
    if (summary) {
      trace.summary = summary;
    }
    
    return { ...trace };
  }
  
  /**
   * Récupère une trace par son ID
   */
  getTrace(traceId: string): PlanTrace | null {
    const trace = this.traces.get(traceId);
    return trace ? { ...trace } : null;
  }
  
  /**
   * Récupère toutes les traces
   */
  getAllTraces(): PlanTrace[] {
    return Array.from(this.traces.values()).map(trace => ({ ...trace }));
  }
  
  /**
   * Récupère les traces récentes (n dernières)
   */
  getRecentTraces(count = 10): PlanTrace[] {
    return Array.from(this.traces.values())
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
      .slice(0, count)
      .map(trace => ({ ...trace }));
  }

  /**
   * Nettoie les traces anciennes (plus de 24h)
   */
  cleanup(thresholdMs = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [traceId, trace] of this.traces.entries()) {
      if (now - trace.startTime > thresholdMs) {
        this.traces.delete(traceId);
        cleanedCount++;
      }
    }
    return cleanedCount;
  }
  
  /**
   * Supprime une trace
   */
  deleteTrace(traceId: string): boolean {
    return this.traces.delete(traceId);
  }
  
  /**
   * Nettoie les traces anciennes (plus de 24h)
   */
  cleanup(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    for (const [traceId, trace] of this.traces.entries()) {
      if (trace.startTime < oneDayAgo) {
        this.traces.delete(traceId);
      }
    }
  }
}

// Singleton pour l'accès global
export const planTracer = new PlanTracer();
