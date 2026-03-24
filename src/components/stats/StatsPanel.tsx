/**
 * Stats Panel (C8)
 * Usage statistics dashboard: total cost, tokens, breakdown by provider and model.
 */

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, X, DollarSign, Cpu, Hash, RefreshCw } from 'lucide-react';
import { db } from '../../db/database';
import { formatCost, formatTokens } from '../../utils/cost';
import { PROVIDERS } from '../../domain/modelCatalog';
import type { ProviderKey } from '../../types/promptcommander';

interface StatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Stats {
  totalCost: number;
  totalInput: number;
  totalOutput: number;
  totalRequests: number;
  byProvider: Record<string, { cost: number; requests: number; tokens: number }>;
  byModel: Record<string, { cost: number; requests: number; tokens: number }>;
}

export const StatsPanel = ({ isOpen, onClose }: StatsPanelProps) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const records = await db.usageRecords.where('createdAt').above(cutoff).toArray();

      const totalCost = records.reduce((s, r) => s + r.cost, 0);
      const totalInput = records.reduce((s, r) => s + r.inputTokens, 0);
      const totalOutput = records.reduce((s, r) => s + r.outputTokens, 0);

      const byProvider: Record<string, { cost: number; requests: number; tokens: number }> = {};
      const byModel: Record<string, { cost: number; requests: number; tokens: number }> = {};

      for (const r of records) {
        if (!byProvider[r.provider]) byProvider[r.provider] = { cost: 0, requests: 0, tokens: 0 };
        byProvider[r.provider].cost += r.cost;
        byProvider[r.provider].requests += 1;
        byProvider[r.provider].tokens += r.inputTokens + r.outputTokens;

        if (!byModel[r.modelId]) byModel[r.modelId] = { cost: 0, requests: 0, tokens: 0 };
        byModel[r.modelId].cost += r.cost;
        byModel[r.modelId].requests += 1;
        byModel[r.modelId].tokens += r.inputTokens + r.outputTokens;
      }

      setStats({ totalCost, totalInput, totalOutput, totalRequests: records.length, byProvider, byModel });
    } catch (error) {
      console.error('[StatsPanel] Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { if (isOpen) loadStats(); }, [isOpen, loadStats]);

  if (!isOpen) return null;

  const cardStyle: React.CSSProperties = {
    padding: '16px', borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-tertiary)',
    textAlign: 'center',
  };

  return (
    <>
      <div onClick={onClose} aria-hidden="true" style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998,
      }} />

      <div role="dialog" aria-label="Statistiques" aria-modal="true" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '95vw', maxWidth: '600px', maxHeight: '80vh',
        backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-secondary)', zIndex: 9999,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: 'var(--shadow-modal)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border-primary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={20} color="var(--color-accent)" />
            <span style={{ fontSize: '16px', fontWeight: 600 }}>Statistiques d'utilisation</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select value={days} onChange={e => setDays(Number(e.target.value))} style={{
              padding: '4px 8px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)', fontSize: '12px',
            }}>
              <option value={7}>7 jours</option>
              <option value={30}>30 jours</option>
              <option value={90}>90 jours</option>
              <option value={365}>1 an</option>
            </select>
            <button onClick={loadStats} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <RefreshCw size={16} />
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ overflow: 'auto', padding: '20px' }}>
          {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Chargement...</div>}
          {stats && !loading && (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <div style={cardStyle}>
                  <DollarSign size={20} color="var(--color-accent)" style={{ margin: '0 auto 4px' }} />
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCost(stats.totalCost)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Coût total</div>
                </div>
                <div style={cardStyle}>
                  <Hash size={20} color="var(--color-accent)" style={{ margin: '0 auto 4px' }} />
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.totalRequests}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Requêtes</div>
                </div>
                <div style={cardStyle}>
                  <Cpu size={20} color="var(--color-accent)" style={{ margin: '0 auto 4px' }} />
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatTokens(stats.totalInput + stats.totalOutput)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tokens</div>
                </div>
              </div>

              {/* By Provider */}
              {Object.keys(stats.byProvider).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Par fournisseur</div>
                  {Object.entries(stats.byProvider).sort((a, b) => b[1].cost - a[1].cost).map(([provider, data]) => (
                    <div key={provider} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0', borderBottom: '1px solid var(--border-primary)', fontSize: '13px',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          backgroundColor: PROVIDERS[provider]?.color || '#666',
                        }} />
                        {PROVIDERS[provider]?.name || provider}
                      </span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {data.requests} req · {formatTokens(data.tokens)} tok · {formatCost(data.cost)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* By Model */}
              {Object.keys(stats.byModel).length > 0 && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Par modèle</div>
                  {Object.entries(stats.byModel).sort((a, b) => b[1].requests - a[1].requests).slice(0, 10).map(([model, data]) => (
                    <div key={model} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0', borderBottom: '1px solid var(--border-primary)', fontSize: '13px',
                    }}>
                      <span>{model}</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {data.requests} req · {formatCost(data.cost)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {stats.totalRequests === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                  Aucune donnée d'utilisation pour cette période
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default StatsPanel;
