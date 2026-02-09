/**
 * Memory Dashboard — Page de gestion de la mémoire long terme de Lisa
 * Inspiré par la transparence d'OpenClaw : l'utilisateur voit et contrôle ce que Lisa retient.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Database, Search, Trash2, Download, Upload, Edit3,
  Check, X, Brain, Star, Clock, Tag, AlertTriangle,
} from 'lucide-react';
import { longTermMemoryService, type MemoryEntry } from '../services/LongTermMemoryService';

type TypeFilter = 'all' | 'fact' | 'preference' | 'instruction' | 'context';
type SortBy = 'date' | 'importance' | 'accessCount';

const TYPE_COLORS: Record<string, string> = {
  fact: '#3b82f6',
  preference: '#f59e0b',
  instruction: '#22c55e',
  context: '#6b7280',
};

const TYPE_LABELS: Record<string, string> = {
  fact: 'Fait',
  preference: 'Préférence',
  instruction: 'Instruction',
  context: 'Contexte',
};

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return d.toLocaleDateString('fr-FR');
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editType, setEditType] = useState<MemoryEntry['type']>('fact');
  const [stats, setStats] = useState<{
    total: number;
    byType: Record<string, number>;
    avgImportance: number;
    mostAccessed: MemoryEntry | null;
  }>({ total: 0, byType: {}, avgImportance: 0, mostAccessed: null });
  const [isLoading, setIsLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadMemories = useCallback(async () => {
    setIsLoading(true);
    try {
      const [all, s] = await Promise.all([
        longTermMemoryService.getAll(),
        longTermMemoryService.getStats(),
      ]);
      setMemories(all);
      setStats(s);
    } catch (error) {
      console.error('[MemoryPage] Failed to load memories:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadMemories(); }, [loadMemories]);

  // Filtrer et trier
  const filtered = memories
    .filter(m => typeFilter === 'all' || m.type === typeFilter)
    .filter(m => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return m.value.toLowerCase().includes(q) ||
             m.key.toLowerCase().includes(q) ||
             m.tags.some(t => t.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (sortBy === 'importance') return b.importance - a.importance;
      if (sortBy === 'accessCount') return b.accessCount - a.accessCount;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleDelete = async (id: string) => {
    await longTermMemoryService.deleteById(id);
    await loadMemories();
  };

  const handleStartEdit = (memory: MemoryEntry) => {
    setEditingId(memory.id);
    setEditValue(memory.value);
    setEditType(memory.type);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    await longTermMemoryService.updateMemory(editingId, {
      value: editValue,
      type: editType,
    });
    setEditingId(null);
    await loadMemories();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleExport = async () => {
    const data = await longTermMemoryService.export();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lisa-memories-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string);
        await longTermMemoryService.import(data);
        await loadMemories();
      } catch (err) {
        console.error('[MemoryPage] Import failed:', err);
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = async () => {
    await longTermMemoryService.clearAll();
    setConfirmClear(false);
    await loadMemories();
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Database size={22} style={{ color: 'var(--color-accent)' }} />
            Mémoire de Lisa
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Ce que Lisa retient entre les conversations
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleExport} style={actionBtnStyle} title="Exporter">
            <Download size={15} /> Exporter
          </button>
          <label style={{ ...actionBtnStyle, cursor: 'pointer' }} title="Importer">
            <Upload size={15} /> Importer
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          {!confirmClear ? (
            <button onClick={() => setConfirmClear(true)} style={{ ...actionBtnStyle, color: '#ef4444' }} title="Tout effacer">
              <Trash2 size={15} /> Effacer tout
            </button>
          ) : (
            <button onClick={handleClearAll} style={{ ...actionBtnStyle, backgroundColor: '#ef4444', color: '#fff' }}>
              <AlertTriangle size={15} /> Confirmer
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <StatCard icon={<Brain size={18} />} label="Total" value={stats.total} color="var(--color-accent)" />
        <StatCard icon={<Tag size={18} />} label="Faits" value={stats.byType.fact || 0} color={TYPE_COLORS.fact} />
        <StatCard icon={<Star size={18} />} label="Préférences" value={stats.byType.preference || 0} color={TYPE_COLORS.preference} />
        <StatCard icon={<Clock size={18} />} label="Sessions" value={stats.byType.context || 0} color={TYPE_COLORS.context} />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="Rechercher dans les souvenirs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-primary)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as TypeFilter)}
          style={selectStyle}
        >
          <option value="all">Tous les types</option>
          <option value="fact">Faits</option>
          <option value="preference">Préférences</option>
          <option value="instruction">Instructions</option>
          <option value="context">Contexte</option>
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortBy)}
          style={selectStyle}
        >
          <option value="date">Plus récents</option>
          <option value="importance">Importance</option>
          <option value="accessCount">Plus consultés</option>
        </select>
      </div>

      {/* Memory list */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
          Chargement...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
          <Brain size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p style={{ margin: 0 }}>
            {memories.length === 0
              ? 'Aucun souvenir pour le moment. Discutez avec Lisa pour commencer !'
              : 'Aucun résultat pour cette recherche.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(memory => (
            <div
              key={memory.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                padding: '14px 16px',
                transition: 'border-color 0.15s',
              }}
            >
              {editingId === memory.id ? (
                /* Editing mode */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={editType}
                      onChange={e => setEditType(e.target.value as MemoryEntry['type'])}
                      style={{ ...selectStyle, flex: '0 0 auto' }}
                    >
                      <option value="fact">Fait</option>
                      <option value="preference">Préférence</option>
                      <option value="instruction">Instruction</option>
                      <option value="context">Contexte</option>
                    </select>
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        backgroundColor: 'var(--bg-panel)',
                        border: '1px solid var(--color-accent)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button onClick={handleCancelEdit} style={{ ...smallBtnStyle, color: 'var(--text-tertiary)' }}>
                      <X size={14} /> Annuler
                    </button>
                    <button onClick={handleSaveEdit} style={{ ...smallBtnStyle, color: 'var(--color-accent)' }}>
                      <Check size={14} /> Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  {/* Type badge */}
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: `${TYPE_COLORS[memory.type] || '#6b7280'}20`,
                    color: TYPE_COLORS[memory.type] || '#6b7280',
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                  }}>
                    {TYPE_LABELS[memory.type] || memory.type}
                  </span>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: 1.5 }}>
                      {memory.value}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: 'var(--text-tertiary)', flexWrap: 'wrap' }}>
                      <span title="Clé">{memory.key}</span>
                      <span title="Importance">
                        <Star size={10} style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                        {Math.round(memory.importance * 100)}%
                      </span>
                      <span title="Accès">{memory.accessCount}x consulté</span>
                      <span title="Date">{formatDate(memory.updatedAt)}</span>
                      {memory.tags.length > 0 && (
                        <span style={{ display: 'flex', gap: '4px' }}>
                          {memory.tags.slice(0, 3).map(tag => (
                            <span key={tag} style={{
                              padding: '0 4px',
                              borderRadius: '3px',
                              backgroundColor: 'var(--bg-hover)',
                              fontSize: '10px',
                            }}>{tag}</span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button onClick={() => handleStartEdit(memory)} style={iconBtnStyle} title="Modifier">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(memory.id)} style={{ ...iconBtnStyle, color: '#ef4444' }} title="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer stats */}
      {filtered.length > 0 && (
        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
          {filtered.length} souvenir{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
          {typeFilter !== 'all' && ` (filtre: ${TYPE_LABELS[typeFilter]})`}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-primary)',
      borderRadius: '8px',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <div style={{ color, opacity: 0.8 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{label}</div>
      </div>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border-primary)',
  borderRadius: '6px',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background-color 0.15s',
};

const smallBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  backgroundColor: 'transparent',
  border: '1px solid var(--border-primary)',
  borderRadius: '4px',
  fontSize: '12px',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const iconBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '4px',
  color: 'var(--text-tertiary)',
  cursor: 'pointer',
  transition: 'background-color 0.15s, color 0.15s',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 10px',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border-primary)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  outline: 'none',
};
