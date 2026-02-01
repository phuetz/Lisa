import React from 'react';
import ReactJson from 'react-json-view';
import { useVisionAudioStore } from '../store/visionAudioStore';
import type { WorkflowStep } from '../store/visionAudioStore';

const statusIcon = {
  pending: '⚪',
  in_progress: '➡️',
  completed: '✔️',
  failed: '❌',
};

const PlannerStatus: React.FC = () => {
  const plan = useVisionAudioStore((s) => s.plan);
  const setPlan = useVisionAudioStore((s) => s.setPlan);

  if (plan === null) {
    return null; // Don't render anything if there's no active plan
  }

  if (plan.length === 0) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-md w-full animate-pulse">
        <p className="text-lg font-semibold">Lisa is thinking...</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-md w-full z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Execution Plan</h3>
        <button onClick={() => setPlan(null)} className="text-gray-400 hover:text-white">
          &times;
        </button>
      </div>
      <ul className="space-y-2 text-sm max-h-60 overflow-y-auto">
        {plan.map((step: WorkflowStep) => (
          <li key={step.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
            <div className="flex-1">
              <div className="flex items-center">
                <span className="mr-2 text-lg">{statusIcon[step.status]}</span>
                <span>{step.description}</span>
              </div>
              {step.status === 'failed' && step.error && (
                <p className="text-xs text-red-400 mt-1 pl-6">Error: {step.error}</p>
              )}
              {step.status === 'completed' && step.output && (
                <div className="text-xs text-green-300 mt-1 pl-6">
                  <span className="font-semibold">Output:</span>
                  {typeof step.output === 'object' ? (
                    <ReactJson
                      src={step.output}
                      theme="ocean"
                      iconStyle="circle"
                      displayDataTypes={false}
                      name={false}
                      style={{ background: 'transparent', paddingTop: '4px' }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{String(step.output)}</p>
                  )}
                </div>
              )}
            </div>
            {step.duration && (
              <span className="text-xs text-gray-400 ml-2">{step.duration.toFixed(2)}s</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlannerStatus;
