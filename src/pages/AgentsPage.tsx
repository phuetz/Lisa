import { useState } from 'react';
import { ModernLayout } from '../components/layout/ModernLayout';
import { Brain, Eye, Mic, Code, Settings, Play, Pause, Plus, X } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'active' | 'inactive';
  icon: React.ElementType;
  tasks: number;
}

// Tab Button Component
const TabButton = ({ 
  label, 
  active, 
  count, 
  onClick 
}: { 
  label: string; 
  active: boolean; 
  count: number; 
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      padding: '10px 16px',
      backgroundColor: active ? '#2d2d2d' : 'transparent',
      border: 'none',
      borderRadius: '8px',
      color: active ? '#fff' : '#888',
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
      backgroundColor: active ? '#10a37f' : '#404040',
      borderRadius: '12px',
      fontSize: '12px',
      color: active ? '#fff' : '#888'
    }}>
      {count}
    </span>
  </button>
);

// Agent Card Component
const AgentCard = ({ 
  agent, 
  onSelect, 
  onToggle 
}: { 
  agent: Agent; 
  onSelect: () => void; 
  onToggle: () => void;
}) => {
  const Icon = agent.icon;
  const categoryColors: Record<string, string> = {
    perception: '#3b82f6',
    cognitive: '#8b5cf6',
    tools: '#f59e0b'
  };
  const color = categoryColors[agent.category] || '#10a37f';

  return (
    <div
      onClick={onSelect}
      className="nav-item"
      style={{
        backgroundColor: '#2d2d2d',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: '1px solid #404040'
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
            color: '#666',
            cursor: 'pointer',
            borderRadius: '6px'
          }}
        >
          <Settings size={18} />
        </button>
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
        {agent.name}
      </h3>
      <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px', lineHeight: 1.5 }}>
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
            backgroundColor: agent.status === 'active' ? '#10a37f' : '#666'
          }} />
          <span style={{ fontSize: '13px', color: agent.status === 'active' ? '#10a37f' : '#666' }}>
            {agent.status === 'active' ? 'Actif' : 'Inactif'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#666' }}>
          <strong style={{ color: '#fff' }}>{agent.tasks}</strong> tâches
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{
            padding: '8px 14px',
            backgroundColor: agent.status === 'active' ? '#ef444420' : '#10a37f20',
            border: 'none',
            borderRadius: '8px',
            color: agent.status === 'active' ? '#ef4444' : '#10a37f',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {agent.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
          {agent.status === 'active' ? 'Arrêter' : 'Démarrer'}
        </button>
      </div>
    </div>
  );
};

// Modal Component
const Modal = ({ 
  isOpen, 
  onClose, 
  agent 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  agent: Agent | null;
}) => {
  if (!isOpen || !agent) return null;
  const Icon = agent.icon;
  const categoryColors: Record<string, string> = {
    perception: '#3b82f6',
    cognitive: '#8b5cf6',
    tools: '#f59e0b'
  };
  const color = categoryColors[agent.category] || '#10a37f';

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
        backgroundColor: '#2d2d2d',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: 0 }}>{agent.name}</h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#888',
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
                backgroundColor: agent.status === 'active' ? '#10a37f' : '#666'
              }} />
              <span style={{ fontSize: '14px', color: agent.status === 'active' ? '#10a37f' : '#666' }}>
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

        <p style={{ fontSize: '14px', color: '#888', marginBottom: '20px', lineHeight: 1.6 }}>
          {agent.description}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          padding: '16px',
          backgroundColor: '#1a1a1a',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <div>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Catégorie</p>
            <p style={{ fontSize: '14px', color: '#fff', textTransform: 'capitalize' }}>{agent.category}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Tâches</p>
            <p style={{ fontSize: '14px', color: '#fff' }}>{agent.tasks}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: '1px solid #404040',
              borderRadius: '8px',
              color: '#888',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Fermer
          </button>
          <button
            style={{
              padding: '10px 20px',
              backgroundColor: '#10a37f',
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

  const agents: Agent[] = [
    {
      id: '1',
      name: 'Vision Agent',
      category: 'perception',
      description: 'Détection d\'objets et reconnaissance visuelle en temps réel',
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
      description: 'Gestion de la mémoire à court et long terme',
      status: 'active',
      icon: Brain,
      tasks: 67,
    },
    {
      id: '4',
      name: 'Code Interpreter',
      category: 'tools',
      description: 'Exécution et interprétation de code',
      status: 'inactive',
      icon: Code,
      tasks: 0,
    },
  ];

  const filteredAgents = activeTab === 'all' 
    ? agents 
    : agents.filter(a => a.category === activeTab);

  return (
    <ModernLayout
      title="Agents"
      action={
        <button
          style={{
            padding: '10px 16px',
            backgroundColor: '#10a37f',
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
        backgroundColor: '#1a1a1a',
        padding: '6px',
        borderRadius: '10px',
        width: 'fit-content'
      }}>
        <TabButton label="Tous" active={activeTab === 'all'} count={agents.length} onClick={() => setActiveTab('all')} />
        <TabButton label="Perception" active={activeTab === 'perception'} count={agents.filter(a => a.category === 'perception').length} onClick={() => setActiveTab('perception')} />
        <TabButton label="Cognitifs" active={activeTab === 'cognitive'} count={agents.filter(a => a.category === 'cognitive').length} onClick={() => setActiveTab('cognitive')} />
        <TabButton label="Outils" active={activeTab === 'tools'} count={agents.filter(a => a.category === 'tools').length} onClick={() => setActiveTab('tools')} />
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
          />
        ))}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} agent={selectedAgent} />
    </ModernLayout>
  );
}
