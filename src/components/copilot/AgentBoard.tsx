/**
 * AgentBoard.tsx — Panneau lateral Agent Board
 *
 * Affiche les 4 agents et leur derniere trace de collaboration.
 */

import { useState, useEffect } from 'react';
import { Bot, Eye, Mic, Brain, Zap, X, Clock } from 'lucide-react';
import { useCopilotStore, copilotSelectors } from '../../store/copilotStore';
import { Badge } from '../ui/Badge';

const AGENT_CONFIG = [
  { key: 'VisionAgent', label: 'VisionAgent', icon: Eye, color: '#06b6d4', badgeColor: 'cyan' as const },
  { key: 'AudioAgent', label: 'AudioAgent', icon: Mic, color: '#8b5cf6', badgeColor: 'accent' as const },
  { key: 'PlannerAgent', label: 'PlannerAgent', icon: Brain, color: '#f5a623', badgeColor: 'accent' as const },
  { key: 'ActionAgent', label: 'ActionAgent', icon: Zap, color: '#22c55e', badgeColor: 'green' as const },
];

const AGENT_NAMES = new Set(AGENT_CONFIG.map(a => a.key));

const EVENT_COLORS: Record<string, string> = {
  cyan: '#06b6d4', purple: '#8b5cf6', amber: '#f5a623', emerald: '#22c55e', blue: '#3b82f6',
};

function formatTimeAgo(ts: number, now: number): string {
  const diff = Math.round((now - ts) / 1000);
  if (diff < 5) return 'a l\'instant';
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  return `il y a ${Math.floor(diff / 3600)}h`;
}

export function AgentBoard() {
  const agents = useCopilotStore(copilotSelectors.agents);
  const events = useCopilotStore(copilotSelectors.events);
  const toggle = useCopilotStore(s => s.toggleAgentBoard);

  // Live tick so formatTimeAgo and isActive refresh every 5s
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') toggle(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggle]);

  // Last 10 events from known agents only
  const traceEvents = events
    .filter((e) => e.source != null && AGENT_NAMES.has(e.source))
    .slice(0, 10);

  return (
    <>
    {/* Backdrop */}
    <div
      onClick={toggle}
      style={{
        position: 'fixed', inset: 0, zIndex: 49,
        backgroundColor: 'rgba(0,0,0,0.3)',
      }}
    />
    <div
      className="glass"
      role="dialog"
      aria-label="Agent Board"
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '380px', maxWidth: '100vw',
        zIndex: 50,
        display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid var(--border-primary)',
        animation: 'slideInFromRight 0.25s ease-out',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={18} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Agent Board</span>
        </div>
        <button
          onClick={toggle}
          aria-label="Fermer le panneau agents"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-tertiary)', padding: '4px',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Agent Cards */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {AGENT_CONFIG.map(({ key, label, icon: Icon, color, badgeColor }) => {
            const trace = agents[key];
            const isActive = trace && (now - trace.updatedAt < 10_000);

            return (
              <div
                key={key}
                style={{
                  padding: '12px 14px', borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: `1px solid ${isActive ? color + '40' : 'var(--border-subtle)'}`,
                  transition: 'border-color var(--transition-normal)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: `${color}20`,
                  }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
                    {label}
                  </span>
                  <div
                    title={isActive ? 'Actif' : 'Inactif'}
                    aria-label={isActive ? 'Agent actif' : 'Agent inactif'}
                    style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      backgroundColor: isActive ? color : 'var(--text-tertiary)',
                      boxShadow: isActive ? `0 0 6px ${color}60` : 'none',
                    }}
                  />
                </div>

                {trace ? (
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px' }}>
                      {trace.lastSummary || trace.lastAction || '—'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {trace.confidence != null && (
                        <Badge color={badgeColor}>
                          {Math.round(trace.confidence * 100)}%
                        </Badge>
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {formatTimeAgo(trace.updatedAt, now)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, fontStyle: 'italic' }}>
                    En attente...
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Trace log */}
        <div>
          <h4 style={{
            fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)',
            margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Clock size={12} />
            Trace des agents
          </h4>

          {traceEvents.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0' }}>
              Aucune trace enregistree
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {traceEvents.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{
                      width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0,
                      backgroundColor: EVENT_COLORS[evt.color] || '#6b7280',
                    }} />
                    <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', minWidth: '50px', fontSize: '11px' }}>
                      {new Date(evt.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    {evt.source && (
                      <span style={{ color: EVENT_COLORS[evt.color] || 'var(--text-tertiary)', fontWeight: 600, fontSize: '11px' }}>
                        {evt.source}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {evt.title}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
    </>
  );
}
