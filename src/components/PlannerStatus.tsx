import React from 'react';
import { useAppStore } from '../store/appStore';
import type { WorkflowStep } from '../store/appStore';

const statusIcon: Record<string, string> = {
  pending: '⚪',
  in_progress: '➡️',
  completed: '✔️',
  failed: '❌',
};

const MAX_OUTPUT_LENGTH = 2000;

function formatOutput(output: unknown): string {
  const json = JSON.stringify(output, null, 2);
  if (json.length > MAX_OUTPUT_LENGTH) {
    return json.slice(0, MAX_OUTPUT_LENGTH) + '\n... (tronqué)';
  }
  return json;
}

const PlannerStatus: React.FC = () => {
  const plan = useAppStore((s) => s.plan);
  const setPlan = useAppStore((s) => s.setPlan);

  if (plan === null) return null;

  if (plan.length === 0) {
    return (
      <div className="fixed bottom-4 right-4 p-4 rounded-lg max-w-md w-full animate-pulse" style={{ background: 'var(--bg-panel, #1a1a26)', color: 'var(--text-primary, #e8e8f0)', border: '1px solid var(--border-primary, #2d2d44)', boxShadow: 'var(--shadow-elevated)' }}>
        <p className="text-lg font-semibold">Lisa réfléchit...</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 rounded-lg max-w-md w-full z-50" role="region" aria-label="Plan d'exécution" style={{ background: 'var(--bg-panel, #1a1a26)', color: 'var(--text-primary, #e8e8f0)', border: '1px solid var(--border-primary, #2d2d44)', boxShadow: 'var(--shadow-elevated)' }}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Plan d'exécution</h3>
        <button
          onClick={() => setPlan(null)}
          className="chat-icon-btn"
          aria-label="Fermer le plan d'exécution"
          style={{ width: 28, height: 28 }}
        >
          &times;
        </button>
      </div>
      <ul className="space-y-2 text-sm max-h-60 overflow-y-auto">
        {plan.map((step: WorkflowStep) => (
          <li key={step.id} className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--bg-surface, #12121a)' }}>
            <div className="flex-1">
              <div className="flex items-center">
                <span className="mr-2 text-lg" aria-hidden="true">{statusIcon[step.status]}</span>
                <span>{step.description}</span>
              </div>
              {step.status === 'failed' && step.error && (
                <p className="text-xs mt-1 pl-6" style={{ color: 'var(--color-error, #ef4444)' }}>Erreur: {step.error}</p>
              )}
              {step.status === 'completed' && step.output && (
                <div className="text-xs mt-1 pl-6" style={{ color: 'var(--color-accent, #f5a623)' }}>
                  <span className="font-semibold">Résultat:</span>
                  {typeof step.output === 'object' ? (
                    <pre className="mt-1 p-2 rounded text-xs overflow-x-auto max-h-32" style={{ background: 'var(--bg-surface, #0a0a0f)' }}>
                      {formatOutput(step.output)}
                    </pre>
                  ) : (
                    <p className="whitespace-pre-wrap">{String(step.output)}</p>
                  )}
                </div>
              )}
            </div>
            {step.duration && (
              <span className="text-xs ml-2" style={{ color: 'var(--text-muted, #6a6a82)' }}>{step.duration.toFixed(2)}s</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlannerStatus;
