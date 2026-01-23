/**
 * Lisa Agent Panel - Console d'agent observable
 * 
 * 3 Panneaux:
 * - 🧰 Tools: appels, args, résultats, durée, statut
 * - 👁️ Perception: visage, mains, posture, objets, capteurs
 * - 🧠 État Lisa: mode, événement, tool actif
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  getToolMeta, 
  type ToolCategory,
  TOOL_METADATA 
} from '../mcp/NativeToolDefinitions';
import { visionEventBus, type VisionEvent } from '../services/VisionEventBus';
import { auditLog, type AuditLogEntry } from '../api/middleware/bridgeSecurity';

// ============================================================================
// Types
// ============================================================================

interface ToolExecution {
  id: string;
  name: string;
  icon: string;
  category: ToolCategory;
  args: Record<string, unknown>;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: unknown;
  error?: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
}

interface PerceptionState {
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  facesDetected: number;
  handsDetected: number;
  currentPose: string;
  lastEmotion: string;
  objectsDetected: string[];
  lastEvent?: VisionEvent;
}

type LisaMode = 'idle' | 'listening' | 'thinking' | 'acting' | 'speaking';

interface LisaState {
  mode: LisaMode;
  activeTool?: string;
  lastSensoryEvent?: string;
  memoryUsage: number;
  agentsLoaded: number;
  uptime: number;
}

// ============================================================================
// Category Colors & Icons
// ============================================================================

const CATEGORY_COLORS: Record<ToolCategory, string> = {
  communication: 'bg-blue-500',
  vision: 'bg-purple-500',
  memory: 'bg-green-500',
  calendar: 'bg-orange-500',
  smarthome: 'bg-yellow-500',
  workflow: 'bg-red-500',
  agent: 'bg-indigo-500',
  system: 'bg-gray-500'
};

// Risk colors disponibles pour usage futur
// const RISK_COLORS = { low: 'text-green-400', medium: 'text-yellow-400', high: 'text-orange-400', critical: 'text-red-400' };

const MODE_ICONS: Record<LisaMode, string> = {
  idle: '😌',
  listening: '👂',
  thinking: '🤔',
  acting: '⚡',
  speaking: '💬'
};

// ============================================================================
// Tool Panel Component
// ============================================================================

interface ToolPanelProps {
  executions: ToolExecution[];
  onReplay?: (execution: ToolExecution) => void;
}

const ToolPanel: React.FC<ToolPanelProps> = ({ executions, onReplay }) => {
  const [filter, setFilter] = useState<ToolCategory | 'all'>('all');
  
  const filtered = filter === 'all' 
    ? executions 
    : executions.filter(e => e.category === filter);

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          🧰 Tools
          <span className="text-xs bg-slate-700 px-2 py-1 rounded">
            {executions.length}
          </span>
        </h3>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value as ToolCategory | 'all')}
          className="bg-slate-700 text-white text-sm rounded px-2 py-1"
        >
          <option value="all">Tous</option>
          <option value="vision">👁️ Vision</option>
          <option value="memory">🧠 Memory</option>
          <option value="calendar">📅 Calendar</option>
          <option value="smarthome">🏠 SmartHome</option>
          <option value="workflow">⚡ Workflow</option>
          <option value="agent">🤖 Agent</option>
          <option value="system">📊 System</option>
        </select>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">
            Aucun appel d'outil pour le moment
          </p>
        ) : (
          filtered.map((exec) => (
            <div 
              key={exec.id}
              className={`p-3 rounded-lg border ${
                exec.status === 'running' ? 'border-blue-500 bg-blue-500/10' :
                exec.status === 'success' ? 'border-green-500/30 bg-green-500/5' :
                exec.status === 'error' ? 'border-red-500/30 bg-red-500/5' :
                'border-slate-600/30 bg-slate-700/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{exec.icon}</span>
                  <span className="font-medium text-white">{exec.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[exec.category]}`}>
                    {exec.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {exec.durationMs && (
                    <span className="text-xs text-slate-400">
                      {exec.durationMs}ms
                    </span>
                  )}
                  {exec.status === 'running' && (
                    <span className="animate-spin">⏳</span>
                  )}
                  {exec.status === 'success' && (
                    <span className="text-green-400">✓</span>
                  )}
                  {exec.status === 'error' && (
                    <span className="text-red-400">✗</span>
                  )}
                  {onReplay && exec.status !== 'running' && (
                    <button 
                      onClick={() => onReplay(exec)}
                      className="text-xs text-slate-400 hover:text-white"
                      title="Rejouer"
                    >
                      🔄
                    </button>
                  )}
                </div>
              </div>
              
              {exec.args && Object.keys(exec.args).length > 0 && (
                <div className="mt-2 text-xs text-slate-400">
                  <details>
                    <summary className="cursor-pointer hover:text-white">
                      Arguments
                    </summary>
                    <pre className="mt-1 p-2 bg-slate-900/50 rounded overflow-x-auto">
                      {JSON.stringify(exec.args, null, 2)}
                    </pre>
                  </details>
                </div>
              )}

              {exec.result && (
                <div className="mt-2 text-xs text-slate-400">
                  <details>
                    <summary className="cursor-pointer hover:text-white">
                      Résultat
                    </summary>
                    <pre className="mt-1 p-2 bg-slate-900/50 rounded overflow-x-auto max-h-32">
                      {JSON.stringify(exec.result, null, 2)}
                    </pre>
                  </details>
                </div>
              )}

              {exec.error && (
                <div className="mt-2 text-xs text-red-400">
                  {exec.error}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Perception Panel Component
// ============================================================================

interface PerceptionPanelProps {
  state: PerceptionState;
  onToggleCamera?: () => void;
  onToggleMicrophone?: () => void;
}

const PerceptionPanel: React.FC<PerceptionPanelProps> = ({ 
  state, 
  onToggleCamera, 
  onToggleMicrophone 
}) => {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
        👁️ Perception
      </h3>

      {/* Capteurs ON/OFF */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={onToggleCamera}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
            state.cameraEnabled 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-slate-700 text-slate-400'
          }`}
        >
          📷 Caméra
          <span className={`w-2 h-2 rounded-full ${state.cameraEnabled ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
        </button>
        <button
          onClick={onToggleMicrophone}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
            state.microphoneEnabled 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
              : 'bg-slate-700 text-slate-400'
          }`}
        >
          🎤 Micro
          <span className={`w-2 h-2 rounded-full ${state.microphoneEnabled ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`} />
        </button>
      </div>

      {/* Détections */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Visages</div>
          <div className="text-2xl font-bold text-white">
            {state.facesDetected}
            <span className="text-sm ml-1">👤</span>
          </div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Mains</div>
          <div className="text-2xl font-bold text-white">
            {state.handsDetected}
            <span className="text-sm ml-1">✋</span>
          </div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Posture</div>
          <div className="text-lg font-medium text-white">
            {state.currentPose || 'N/A'}
          </div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Émotion</div>
          <div className="text-lg font-medium text-white">
            {state.lastEmotion || 'N/A'}
          </div>
        </div>
      </div>

      {/* Objets détectés */}
      {state.objectsDetected.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-slate-400 mb-2">Objets détectés</div>
          <div className="flex flex-wrap gap-2">
            {state.objectsDetected.map((obj, i) => (
              <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-sm">
                {obj}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dernier événement */}
      {state.lastEvent && (
        <div className="mt-4 p-2 bg-slate-900/50 rounded text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span className="text-purple-400">{state.lastEvent.type}</span>
            <span>{new Date(state.lastEvent.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="mt-1 text-slate-500">
            Confidence: {(state.lastEvent.confidence * 100).toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Lisa State Panel Component
// ============================================================================

interface LisaStatePanelProps {
  state: LisaState;
  onPanicStop?: () => void;
}

const LisaStatePanel: React.FC<LisaStatePanelProps> = ({ state, onPanicStop }) => {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          🧠 État de Lisa
        </h3>
        {onPanicStop && (
          <button
            onClick={onPanicStop}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg flex items-center gap-1"
          >
            🛑 STOP
          </button>
        )}
      </div>

      {/* Mode actuel */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-4xl">{MODE_ICONS[state.mode]}</div>
        <div>
          <div className="text-xl font-bold text-white capitalize">{state.mode}</div>
          <div className="text-sm text-slate-400">
            {state.mode === 'idle' && 'En attente'}
            {state.mode === 'listening' && 'Écoute active'}
            {state.mode === 'thinking' && 'Réflexion en cours...'}
            {state.mode === 'acting' && 'Exécution d\'action'}
            {state.mode === 'speaking' && 'En train de répondre'}
          </div>
        </div>
      </div>

      {/* Tool actif */}
      {state.activeTool && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="text-xs text-blue-400 mb-1">Tool actif</div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{getToolMeta(state.activeTool)?.icon || '🔧'}</span>
            <span className="text-white font-medium">{state.activeTool}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-700/50 rounded p-2">
          <div className="text-xs text-slate-400">Mémoire</div>
          <div className="text-lg font-bold text-white">{state.memoryUsage}%</div>
        </div>
        <div className="bg-slate-700/50 rounded p-2">
          <div className="text-xs text-slate-400">Agents</div>
          <div className="text-lg font-bold text-white">{state.agentsLoaded}</div>
        </div>
        <div className="bg-slate-700/50 rounded p-2">
          <div className="text-xs text-slate-400">Uptime</div>
          <div className="text-lg font-bold text-white">{formatUptime(state.uptime)}</div>
        </div>
      </div>

      {/* Dernier événement sensoriel */}
      {state.lastSensoryEvent && (
        <div className="mt-4 text-xs text-slate-500">
          Dernier événement: {state.lastSensoryEvent}
        </div>
      )}
    </div>
  );
};

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

// ============================================================================
// Main Lisa Agent Panel
// ============================================================================

interface LisaAgentPanelProps {
  className?: string;
}

export const LisaAgentPanel: React.FC<LisaAgentPanelProps> = ({ className }) => {
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);
  const [perceptionState, setPerceptionState] = useState<PerceptionState>({
    cameraEnabled: false,
    microphoneEnabled: false,
    facesDetected: 0,
    handsDetected: 0,
    currentPose: '',
    lastEmotion: '',
    objectsDetected: []
  });
  const [lisaState, setLisaState] = useState<LisaState>({
    mode: 'idle',
    memoryUsage: 0,
    agentsLoaded: 0,
    uptime: 0
  });

  // Subscribe to vision events
  useEffect(() => {
    const unsubscribe = visionEventBus.on('*', (event: VisionEvent) => {
      setPerceptionState(prev => ({
        ...prev,
        lastEvent: event,
        ...(event.type === 'FACE_DETECTED' && { facesDetected: prev.facesDetected + 1 }),
        ...(event.type === 'HAND_GESTURE' && { handsDetected: 2 }),
        ...(event.type === 'BODY_POSE' && { currentPose: String((event.value as { pose: string }).pose) }),
        ...(event.type === 'EMOTION_DETECTED' && { lastEmotion: String((event.value as { emotion: string }).emotion) }),
        ...(event.type === 'OBJECT_DETECTED' && { 
          objectsDetected: [...prev.objectsDetected.slice(-4), String((event.value as { label: string }).label)]
        })
      }));
    });

    return unsubscribe;
  }, []);

  // Subscribe to audit log
  useEffect(() => {
    const unsubscribe = auditLog.subscribe((entry: AuditLogEntry) => {
      if (entry.action === 'invoke') {
        const meta = TOOL_METADATA[entry.tool];
        const newExecution: ToolExecution = {
          id: entry.traceId,
          name: entry.tool,
          icon: meta?.icon || '🔧',
          category: meta?.category || 'system',
          args: entry.args || {},
          status: 'running',
          startTime: Date.now()
        };
        setToolExecutions(prev => [newExecution, ...prev.slice(0, 19)]);
        setLisaState(prev => ({ ...prev, mode: 'acting', activeTool: entry.tool }));
      } else if (entry.action === 'success' || entry.action === 'error') {
        setToolExecutions(prev => prev.map(exec => 
          exec.id === entry.traceId 
            ? {
                ...exec,
                status: entry.action as 'success' | 'error',
                result: entry.result,
                error: entry.error,
                endTime: Date.now(),
                durationMs: entry.durationMs || (Date.now() - exec.startTime)
              }
            : exec
        ));
        setLisaState(prev => ({ ...prev, mode: 'idle', activeTool: undefined }));
      }
    });

    return unsubscribe;
  }, []);

  // Update uptime
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setLisaState(prev => ({ ...prev, uptime: Date.now() - startTime }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleCamera = useCallback(() => {
    setPerceptionState(prev => ({ ...prev, cameraEnabled: !prev.cameraEnabled }));
  }, []);

  const handleToggleMicrophone = useCallback(() => {
    setPerceptionState(prev => ({ ...prev, microphoneEnabled: !prev.microphoneEnabled }));
  }, []);

  const handlePanicStop = useCallback(() => {
    setPerceptionState(prev => ({ 
      ...prev, 
      cameraEnabled: false, 
      microphoneEnabled: false 
    }));
    setLisaState(prev => ({ ...prev, mode: 'idle', activeTool: undefined }));
  }, []);

  const handleReplay = useCallback((execution: ToolExecution) => {
    console.log('Replay tool:', execution.name, execution.args);
    // TODO: Implement actual replay
  }, []);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 ${className || ''}`}>
      <ToolPanel 
        executions={toolExecutions} 
        onReplay={handleReplay}
      />
      <PerceptionPanel 
        state={perceptionState}
        onToggleCamera={handleToggleCamera}
        onToggleMicrophone={handleToggleMicrophone}
      />
      <LisaStatePanel 
        state={lisaState}
        onPanicStop={handlePanicStop}
      />
    </div>
  );
};

export default LisaAgentPanel;
