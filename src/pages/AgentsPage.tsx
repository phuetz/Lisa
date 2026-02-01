import { useState } from 'react';
import { OfficePageLayout } from '../components/layout/OfficePageLayout';
import { useOfficeThemeStore } from '../store/officeThemeStore';
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

interface ThemeColors {
  sidebar: string;
  sidebarHover: string;
  sidebarActive: string;
  editor: string;
  editorText: string;
  editorSecondary: string;
  dialog: string;
  border: string;
  accent: string;
  success: string;
  error: string;
}

// Tab Button Component
const TabButton = ({
  label,
  active,
  count,
  onClick,
  colors
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
  colors: ThemeColors;
}) => (
  <button
    onClick={onClick}
    style={{
      padding: '10px 16px',
      backgroundColor: active ? colors.sidebarActive : 'transparent',
      border: 'none',
      borderRadius: '8px',
      color: active ? colors.editorText : colors.editorSecondary,
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s ease'
    }}
  >
    {label}
    <span style={{
      padding: '2px 8px',
      backgroundColor: active ? colors.accent : colors.sidebarHover,
      borderRadius: '12px',
      fontSize: '12px',
      color: active ? '#fff' : colors.editorSecondary
    }}>
      {count}
    </span>
  </button>
);

// Agent Card Component
const AgentCard = ({
  agent,
  onSelect,
  onToggle,
  colors
}: {
  agent: Agent;
  onSelect: () => void;
  onToggle: () => void;
  colors: ThemeColors;
}) => {
  const Icon = agent.icon;
  const categoryColors: Record<string, string> = {
    perception: '#3b82f6',
    cognitive: '#8b5cf6',
    tools: '#f59e0b',
    research: '#10b981',
    analysis: '#ec4899',
    creative: '#f97316',
  };
  const color = categoryColors[agent.category] || colors.accent;

  return (
    <div
      onClick={onSelect}
      style={{
        backgroundColor: colors.dialog,
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: `1px solid ${colors.border}`
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={24} color={color} />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); }}
          style={{
            padding: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            color: colors.editorSecondary,
            cursor: 'pointer',
            borderRadius: '6px'
          }}
        >
          <Settings size={18} />
        </button>
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.editorText, marginBottom: '8px' }}>
        {agent.name}
      </h3>
      <p style={{ fontSize: '13px', color: colors.editorSecondary, marginBottom: '16px', lineHeight: 1.5 }}>
        {agent.description}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{
          padding: '4px 10px',
          backgroundColor: `${color}20`,
          borderRadius: '6px',
          fontSize: '12px',
          color: color,
          textTransform: 'capitalize'
        }}>
          {agent.category}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: agent.status === 'active' ? colors.success : colors.editorSecondary
          }} />
          <span style={{ fontSize: '13px', color: agent.status === 'active' ? colors.success : colors.editorSecondary }}>
            {agent.status === 'active' ? 'Actif' : 'Inactif'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: colors.editorSecondary }}>
          <strong style={{ color: colors.editorText }}>{agent.tasks}</strong> taches
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{
            padding: '8px 14px',
            backgroundColor: agent.status === 'active' ? `${colors.error}20` : `${colors.success}20`,
            border: 'none',
            borderRadius: '8px',
            color: agent.status === 'active' ? colors.error : colors.success,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {agent.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
          {agent.status === 'active' ? 'Arreter' : 'Demarrer'}
        </button>
      </div>
    </div>
  );
};

// Modal Component
const Modal = ({
  isOpen,
  onClose,
  agent,
  colors
}: {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
  colors: ThemeColors;
}) => {
  if (!isOpen || !agent) return null;
  const Icon = agent.icon;
  const categoryColors: Record<string, string> = {
    perception: '#3b82f6',
    cognitive: '#8b5cf6',
    tools: '#f59e0b',
    research: '#10b981',
    analysis: '#ec4899',
    creative: '#f97316',
  };
  const color = categoryColors[agent.category] || colors.accent;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: colors.dialog,
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        padding: '24px',
        border: `1px solid ${colors.border}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.editorText, margin: 0 }}>{agent.name}</h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.editorSecondary,
              cursor: 'pointer',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            backgroundColor: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={28} color={color} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: agent.status === 'active' ? colors.success : colors.editorSecondary
              }} />
              <span style={{ fontSize: '14px', color: agent.status === 'active' ? colors.success : colors.editorSecondary }}>
                {agent.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <span style={{
              padding: '4px 10px',
              backgroundColor: `${color}20`,
              borderRadius: '6px',
              fontSize: '12px',
              color: color,
              textTransform: 'capitalize'
            }}>
              {agent.category}
            </span>
          </div>
        </div>

        <p style={{ fontSize: '14px', color: colors.editorSecondary, marginBottom: '20px', lineHeight: 1.6 }}>
          {agent.description}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          padding: '16px',
          backgroundColor: colors.sidebar,
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <div>
            <p style={{ fontSize: '12px', color: colors.editorSecondary, marginBottom: '4px' }}>Categorie</p>
            <p style={{ fontSize: '14px', color: colors.editorText, textTransform: 'capitalize' }}>{agent.category}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: colors.editorSecondary, marginBottom: '4px' }}>Taches</p>
            <p style={{ fontSize: '14px', color: colors.editorText }}>{agent.tasks}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              color: colors.editorSecondary,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Fermer
          </button>
          <button
            style={{
              padding: '10px 20px',
              backgroundColor: colors.accent,
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Settings size={16} />
            Configurer
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Get theme colors
  const { getCurrentColors } = useOfficeThemeStore();
  const colors = getCurrentColors();

  const agents: Agent[] = [
    {
      id: '1',
      name: 'Vision Agent',
      category: 'perception',
      description: 'Detection d\'objets et reconnaissance visuelle en temps reel',
      status: 'active',
      icon: Eye,
      tasks: 45,
    },
    {
      id: '2',
      name: 'Audio Classifier',
      category: 'perception',
      description: 'Classification des sons et analyse audio',
      status: 'active',
      icon: Mic,
      tasks: 23,
    },
    {
      id: '3',
      name: 'Memory Manager',
      category: 'cognitive',
      description: 'Gestion de la memoire a court et long terme',
      status: 'active',
      icon: Brain,
      tasks: 67,
    },
    {
      id: '4',
      name: 'Code Interpreter',
      category: 'tools',
      description: 'Execution et interpretation de code',
      status: 'inactive',
      icon: Code,
      tasks: 0,
    },
    {
      id: '5',
      name: 'Research Agent',
      category: 'research',
      description: 'Recherche web, synthese d\'actualites et veille en temps reel',
      status: 'active',
      icon: Search,
      tasks: 12,
    },
    {
      id: '6',
      name: 'Data Analyst',
      category: 'analysis',
      description: 'Analyse CSV/Excel, statistiques, correlations et graphiques',
      status: 'active',
      icon: BarChart3,
      tasks: 8,
    },
    {
      id: '7',
      name: 'Creative Marketing',
      category: 'creative',
      description: 'Copywriting, posts reseaux sociaux, campagnes email',
      status: 'active',
      icon: Palette,
      tasks: 15,
    },
    {
      id: '8',
      name: 'Code Review',
      category: 'analysis',
      description: 'Revue de code, generation, refactoring et tests',
      status: 'active',
      icon: FileCode,
      tasks: 22,
    },
  ];

  const filteredAgents = activeTab === 'all'
    ? agents
    : agents.filter(a => a.category === activeTab);

  return (
    <OfficePageLayout
      title="Agents"
      subtitle={`${agents.filter(a => a.status === 'active').length} agents actifs`}
      action={
        <button
          style={{
            padding: '10px 16px',
            backgroundColor: colors.accent,
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Plus size={18} />
          Nouvel Agent
        </button>
      }
    >
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        backgroundColor: colors.sidebar,
        padding: '6px',
        borderRadius: '10px',
        width: 'fit-content',
        flexWrap: 'wrap'
      }}>
        <TabButton label="Tous" active={activeTab === 'all'} count={agents.length} onClick={() => setActiveTab('all')} colors={colors} />
        <TabButton label="Perception" active={activeTab === 'perception'} count={agents.filter(a => a.category === 'perception').length} onClick={() => setActiveTab('perception')} colors={colors} />
        <TabButton label="Cognitifs" active={activeTab === 'cognitive'} count={agents.filter(a => a.category === 'cognitive').length} onClick={() => setActiveTab('cognitive')} colors={colors} />
        <TabButton label="Outils" active={activeTab === 'tools'} count={agents.filter(a => a.category === 'tools').length} onClick={() => setActiveTab('tools')} colors={colors} />
        <TabButton label="Recherche" active={activeTab === 'research'} count={agents.filter(a => a.category === 'research').length} onClick={() => setActiveTab('research')} colors={colors} />
        <TabButton label="Analyse" active={activeTab === 'analysis'} count={agents.filter(a => a.category === 'analysis').length} onClick={() => setActiveTab('analysis')} colors={colors} />
        <TabButton label="Creatif" active={activeTab === 'creative'} count={agents.filter(a => a.category === 'creative').length} onClick={() => setActiveTab('creative')} colors={colors} />
      </div>

      {/* Agents Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {filteredAgents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onSelect={() => { setSelectedAgent(agent); setShowModal(true); }}
            onToggle={() => console.log('Toggle', agent.name)}
            colors={colors}
          />
        ))}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} agent={selectedAgent} colors={colors} />
    </OfficePageLayout>
  );
}
