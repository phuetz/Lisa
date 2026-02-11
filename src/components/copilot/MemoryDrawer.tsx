/**
 * MemoryDrawer.tsx — Panneau memoire du Copilote
 *
 * 2 onglets : Session (ephemere) et Epinglee (persistante).
 */

import { useState, useRef, useEffect } from 'react';
import { Brain, Pin, Trash2, X, Plus, Clock, AlertTriangle } from 'lucide-react';
import { useCopilotStore, copilotSelectors } from '../../store/copilotStore';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

type Tab = 'session' | 'pinned';

export function MemoryDrawer() {
  const [activeTab, setActiveTab] = useState<Tab>('session');
  const [newPinText, setNewPinText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const session = useCopilotStore(copilotSelectors.session);
  const pinned = useCopilotStore(copilotSelectors.pinned);
  const forgetSession = useCopilotStore(s => s.forgetSession);
  const pinItem = useCopilotStore(s => s.pinItem);
  const unpinItem = useCopilotStore(s => s.unpinItem);
  const toggle = useCopilotStore(s => s.toggleMemoryDrawer);

  // Live tick so sessionAge and isExpired refresh every 30s
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') toggle(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggle]);

  // Auto-focus input when switching to pinned tab
  useEffect(() => {
    if (activeTab === 'pinned') {
      // Small delay to let the tab panel render
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [activeTab]);

  const handlePin = () => {
    const text = newPinText.trim();
    if (!text) return;
    pinItem(text, 'manual');
    setNewPinText('');
    inputRef.current?.focus();
  };

  const sessionAge = Math.round((now - session.startedAt) / 60_000);
  const isExpired = now > session.expiresAt;

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
      aria-label="Memoire"
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
          <Brain size={18} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Memoire</span>
        </div>
        <button
          onClick={toggle}
          aria-label="Fermer le panneau memoire"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-tertiary)', padding: '4px',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Type de memoire" style={{ display: 'flex', gap: '4px', padding: '12px 20px 0' }}>
        {(['session', 'pinned'] as Tab[]).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`tabpanel-${tab}`}
            id={`tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)',
              border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              fontFamily: 'inherit',
              backgroundColor: activeTab === tab ? 'var(--color-brand-subtle)' : 'transparent',
              color: activeTab === tab ? 'var(--color-accent)' : 'var(--text-tertiary)',
              transition: 'all var(--transition-fast)',
            }}
          >
            {tab === 'session' ? 'Session' : 'Epinglee'}
            {tab === 'pinned' && pinned.length > 0 && (
              <span style={{
                marginLeft: '6px', fontSize: '11px', padding: '1px 6px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--color-brand-subtle)',
                color: 'var(--color-accent)',
              }}>
                {pinned.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}
      >
        {activeTab === 'session' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Session info */}
            <div style={{
              padding: '12px', borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  Session active depuis {sessionAge} min
                </span>
                {isExpired && <Badge color="red">Expiree</Badge>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {session.events.length} evenement{session.events.length !== 1 ? 's' : ''} enregistre{session.events.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Context fields */}
            {session.context.lastVisionSummary && (
              <ContextField label="Vision" value={session.context.lastVisionSummary} color="cyan" />
            )}
            {session.context.lastAudioSummary && (
              <ContextField label="Audio" value={session.context.lastAudioSummary} color="accent" />
            )}
            {session.context.lastIntent && (
              <ContextField label="Intention" value={session.context.lastIntent} color="accent" />
            )}
            {session.context.lastAction && (
              <ContextField label="Action" value={session.context.lastAction} color="green" />
            )}

            {!session.context.lastVisionSummary && !session.context.lastAudioSummary && (
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>
                Aucun contexte pour cette session
              </p>
            )}

            {/* Forget button */}
            <Button
              variant="danger"
              size="sm"
              icon={<AlertTriangle size={14} />}
              onClick={forgetSession}
              style={{ marginTop: '8px' }}
            >
              Oublier cette session
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Add input */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={inputRef}
                type="text"
                value={newPinText}
                onChange={(e) => setNewPinText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePin(); }}
                placeholder="Epingler un souvenir..."
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)',
                  backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)',
                  fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                }}
              />
              <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handlePin}>
                Ajouter
              </Button>
            </div>

            {/* Pinned list */}
            {pinned.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>
                Aucun souvenir epingle
              </p>
            ) : (
              pinned.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '10px 12px', borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  }}
                >
                  <Pin size={14} style={{ color: 'var(--color-accent)', marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, wordBreak: 'break-word' }}>
                      {item.text}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      {item.source && ` — ${item.source}`}
                    </span>
                  </div>
                  <button
                    onClick={() => unpinItem(item.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-tertiary)', padding: '2px', flexShrink: 0,
                    }}
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Slide-in animation */}
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

/* --- Small helper component --- */

function ContextField({ label, value, color }: { label: string; value: string; color: 'cyan' | 'accent' | 'green' }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
    }}>
      <Badge color={color === 'cyan' ? 'cyan' : color === 'green' ? 'green' : 'accent'} style={{ marginBottom: '6px' }}>
        {label}
      </Badge>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>{value}</p>
    </div>
  );
}
