/**
 * Monitoring Dashboard
 * Vue en temps réel des métriques système et circuit breakers - AudioReader Studio design
 */

import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useCircuitBreakers } from '../hooks/useCircuitBreakers';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
}

function MetricCard({ title, value, icon, trend, color = 'var(--color-accent)' }: MetricCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-primary)',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>{title}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
        {value}
      </div>
      {trend && (
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
          {trend === 'up' && '↗ En hausse'}
          {trend === 'down' && '↘ En baisse'}
          {trend === 'stable' && '→ Stable'}
        </p>
      )}
    </div>
  );
}

function CircuitStateChip({ state }: { state: string }) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    open: {
      bg: 'rgba(239, 68, 68, 0.15)',
      text: 'var(--color-red)',
      border: 'rgba(239, 68, 68, 0.3)',
    },
    'half-open': {
      bg: 'rgba(245, 158, 11, 0.15)',
      text: 'var(--color-accent)',
      border: 'rgba(245, 158, 11, 0.3)',
    },
    closed: {
      bg: 'rgba(34, 197, 94, 0.15)',
      text: 'var(--color-green)',
      border: 'rgba(34, 197, 94, 0.3)',
    },
  };
  const c = colorMap[state] || colorMap.closed;

  return (
    <span
      style={{
        padding: '3px 10px',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        borderRadius: '6px',
      }}
    >
      {state}
    </span>
  );
}

export function MonitoringPage() {
  const { circuits, resetCircuit } = useCircuitBreakers();

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ margin: '0 0 24px', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
        Dashboard Monitoring
      </h1>

      {/* Metric cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <MetricCard
          title="Agents Actifs"
          value={circuits.length}
          icon={<Activity size={20} />}
          trend="stable"
        />
        <MetricCard
          title="Circuits Ouverts"
          value={circuits.filter((c) => c.state === 'open').length}
          icon={<AlertTriangle size={20} />}
          color="var(--color-red)"
        />
        <MetricCard
          title="Circuits Fermés"
          value={circuits.filter((c) => c.state === 'closed').length}
          icon={<CheckCircle size={20} />}
          color="var(--color-green)"
        />
        <MetricCard
          title="Half-Open"
          value={circuits.filter((c) => c.state === 'half-open').length}
          icon={<Clock size={20} />}
          color="var(--color-cyan)"
        />
      </div>

      {/* Circuit Breakers section */}
      <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
        Circuit Breakers
      </h2>

      {circuits.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-primary)',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            Aucun circuit breaker actif pour le moment
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {circuits.map((circuit) => (
            <div
              key={circuit.key}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-primary)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {circuit.key}
                </span>
                <CircuitStateChip state={circuit.state} />
              </div>

              {/* Failure progress */}
              <div style={{ marginBottom: '12px' }}>
                <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Échecs: <span className="font-mono">{circuit.failures}</span>
                </p>
                <div
                  style={{
                    height: '4px',
                    backgroundColor: 'var(--bg-panel)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min((circuit.failures / 5) * 100, 100)}%`,
                      backgroundColor: circuit.failures >= 5 ? 'var(--color-red)' : 'var(--color-accent)',
                      borderRadius: '2px',
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>

              {circuit.lastFailure > 0 && (
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--color-red)' }}>
                  Dernier échec:{' '}
                  {formatDistanceToNow(circuit.lastFailure, { addSuffix: true, locale: fr })}
                </p>
              )}
              {circuit.lastSuccess > 0 && (
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--color-green)' }}>
                  Dernier succès:{' '}
                  {formatDistanceToNow(circuit.lastSuccess, { addSuffix: true, locale: fr })}
                </p>
              )}

              <button
                onClick={() => resetCircuit(circuit.key)}
                disabled={circuit.state === 'closed' && circuit.failures === 0}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  cursor: circuit.state === 'closed' && circuit.failures === 0 ? 'default' : 'pointer',
                  opacity: circuit.state === 'closed' && circuit.failures === 0 ? 0.4 : 1,
                }}
              >
                Réinitialiser
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div
        style={{
          marginTop: '32px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-primary)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          À propos des Circuit Breakers
        </h3>
        <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--color-green)' }}>Closed:</strong> Le circuit fonctionne normalement. Les requêtes passent.
        </p>
        <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--color-red)' }}>Open:</strong> Trop d'échecs détectés (≥5). Les requêtes sont bloquées pendant 30 secondes.
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--color-accent)' }}>Half-Open:</strong> Test de rétablissement. Permet quelques requêtes pour vérifier si le service est revenu.
        </p>
      </div>
    </div>
  );
}
