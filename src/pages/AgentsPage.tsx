/**
 * Agents Page - AudioReader Studio design
 * Gestion des agents Lisa avec grille et filtrage par catégorie
 */

import { useState } from 'react';
import { Brain, Eye, Mic, Code, Settings, Play, Pause, Plus, X, Search, BarChart3, Palette, FileCode } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'active' | 'inactive';
  icon: React.ElementType;
  tasks: number;
}

const categoryColors: Record<string, string> = {
  perception: '#06b6d4',
  cognitive: '#a78bfa',
  tools: '#f5a623',
  research: '#22c55e',
  analysis: '#f472b6',
  creative: '#fb923c',
};

// Tab Button
function TabButton({ label, active, count, onClick }: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        backgroundColor: active ? 'rgba(245, 166, 35, 0.12)' : 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: active ? 'var(--color-accent)' : 'var(--text-muted)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.15s',
      }}
    >
      {label}
      <span
        style={{
          padding: '1px 7px',
          backgroundColor: active ? 'var(--color-accent)' : 'var(--bg-panel)',
          borderRadius: '10px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          color: active ? 'var(--bg-deep)' : 'var(--text-muted)',
        }}
      >
        {count}
      </span>
    </button>
  );
}

// Agent Card
function AgentCard({ agent, onSelect, onToggle }: {
  agent: Agent;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const Icon = agent.icon;
  const color = categoryColors[agent.category] || 'var(--color-accent)';

  return (
    <div
      onClick={onSelect}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'border-color 0.2s',
        border: '1px solid var(--border-primary)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={22} color={color} />
        </div>
        <button
          onClick={(e) => e.stopPropagation()}
          style={{
            padding: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            borderRadius: '6px',
          }}
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Name & description */}
      <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
        {agent.name}
      </h3>
      <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {agent.description}
      </p>

      {/* Category + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span
          style={{
            padding: '3px 10px',
            backgroundColor: `${color}18`,
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 500,
            color: color,
            textTransform: 'capitalize',
          }}
        >
          {agent.category}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: agent.status === 'active' ? 'var(--color-green)' : 'var(--text-muted)',
            }}
          />
          <span style={{ fontSize: '12px', color: agent.status === 'active' ? 'var(--color-green)' : 'var(--text-muted)' }}>
            {agent.status === 'active' ? 'Actif' : 'Inactif'}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{agent.tasks}</strong> tâches
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{
            padding: '6px 12px',
            backgroundColor: agent.status === 'active' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
            border: 'none',
            borderRadius: '6px',
            color: agent.status === 'active' ? 'var(--color-red)' : 'var(--color-green)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          {agent.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
          {agent.status === 'active' ? 'Arrêter' : 'Démarrer'}
        </button>
      </div>
    </div>
  );
}

// Agent Detail Modal
function AgentModal({ agent, onClose }: { agent: Agent | null; onClose: () => void }) {
  if (!agent) return null;
  const Icon = agent.icon;
  const color = categoryColors[agent.category] || 'var(--color-accent)';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 10, 15, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          padding: '24px',
          border: '1px solid var(--border-primary)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{agent.name}</h2>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Agent info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              backgroundColor: `${color}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={26} color={color} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: agent.status === 'active' ? 'var(--color-green)' : 'var(--text-muted)',
                }}
              />
              <span style={{ fontSize: '13px', color: agent.status === 'active' ? 'var(--color-green)' : 'var(--text-muted)' }}>
                {agent.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <span
              style={{
                padding: '3px 10px',
                backgroundColor: `${color}18`,
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                color: color,
                textTransform: 'capitalize',
              }}
            >
              {agent.category}
            </span>
          </div>
        </div>

        <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {agent.description}
        </p>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            padding: '14px',
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '10px',
            marginBottom: '20px',
          }}
        >
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '11px', color: 'var(--text-muted)' }}>Catégorie</p>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{agent.category}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '11px', color: 'var(--text-muted)' }}>Tâches</p>
            <p className="font-mono" style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>{agent.tasks}</p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'inherit',
            }}
          >
            Fermer
          </button>
          <button
            style={{
              padding: '8px 18px',
              backgroundColor: 'var(--color-accent)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--bg-deep)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Settings size={14} />
            Configurer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const agents: Agent[] = [
    { id: '1', name: 'Vision Agent', category: 'perception', description: 'Détection d\'objets et reconnaissance visuelle en temps réel', status: 'active', icon: Eye, tasks: 45 },
    { id: '2', name: 'Audio Classifier', category: 'perception', description: 'Classification des sons et analyse audio', status: 'active', icon: Mic, tasks: 23 },
    { id: '3', name: 'Memory Manager', category: 'cognitive', description: 'Gestion de la mémoire à court et long terme', status: 'active', icon: Brain, tasks: 67 },
    { id: '4', name: 'Code Interpreter', category: 'tools', description: 'Exécution et interprétation de code', status: 'inactive', icon: Code, tasks: 0 },
    { id: '5', name: 'Research Agent', category: 'research', description: 'Recherche web, synthèse d\'actualités et veille en temps réel', status: 'active', icon: Search, tasks: 12 },
    { id: '6', name: 'Data Analyst', category: 'analysis', description: 'Analyse CSV/Excel, statistiques, corrélations et graphiques', status: 'active', icon: BarChart3, tasks: 8 },
    { id: '7', name: 'Creative Marketing', category: 'creative', description: 'Copywriting, posts réseaux sociaux, campagnes email', status: 'active', icon: Palette, tasks: 15 },
    { id: '8', name: 'Code Review', category: 'analysis', description: 'Revue de code, génération, refactoring et tests', status: 'active', icon: FileCode, tasks: 22 },
  ];

  const filteredAgents = activeTab === 'all' ? agents : agents.filter((a) => a.category === activeTab);

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Agents</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            {agents.filter((a) => a.status === 'active').length} agents actifs sur {agents.length}
          </p>
        </div>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: 'var(--color-accent)',
            border: 'none',
            borderRadius: '8px',
            color: 'var(--bg-deep)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          <Plus size={16} />
          Nouvel Agent
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          backgroundColor: 'var(--bg-surface)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid var(--border-primary)',
          width: 'fit-content',
          flexWrap: 'wrap',
        }}
      >
        <TabButton label="Tous" active={activeTab === 'all'} count={agents.length} onClick={() => setActiveTab('all')} />
        <TabButton label="Perception" active={activeTab === 'perception'} count={agents.filter((a) => a.category === 'perception').length} onClick={() => setActiveTab('perception')} />
        <TabButton label="Cognitifs" active={activeTab === 'cognitive'} count={agents.filter((a) => a.category === 'cognitive').length} onClick={() => setActiveTab('cognitive')} />
        <TabButton label="Outils" active={activeTab === 'tools'} count={agents.filter((a) => a.category === 'tools').length} onClick={() => setActiveTab('tools')} />
        <TabButton label="Recherche" active={activeTab === 'research'} count={agents.filter((a) => a.category === 'research').length} onClick={() => setActiveTab('research')} />
        <TabButton label="Analyse" active={activeTab === 'analysis'} count={agents.filter((a) => a.category === 'analysis').length} onClick={() => setActiveTab('analysis')} />
        <TabButton label="Créatif" active={activeTab === 'creative'} count={agents.filter((a) => a.category === 'creative').length} onClick={() => setActiveTab('creative')} />
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}
      >
        {filteredAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onSelect={() => { setSelectedAgent(agent); setShowModal(true); }}
            onToggle={() => console.log('Toggle', agent.name)}
          />
        ))}
      </div>

      {/* Modal */}
      {showModal && <AgentModal agent={selectedAgent} onClose={() => setShowModal(false)} />}
    </div>
  );
}
