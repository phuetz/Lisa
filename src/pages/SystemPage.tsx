import { useState } from 'react';
import SystemIntegrationPanel from '../components/SystemIntegrationPanel';
import MemoryPanel from '../components/MemoryPanel';
import DebugPanel from '../components/DebugPanel';
import { SecurityPanel } from '../components/SecurityPanel';
import { HealthMonitorPanel } from '../components/health';
import { Cpu, Database, Bug, Shield, Activity, ChevronRight } from 'lucide-react';

const TabItem = ({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      backgroundColor: active ? 'rgba(245, 166, 35, 0.12)' : 'transparent',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      marginBottom: '4px',
      transition: 'all 0.2s ease'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Icon size={20} color={active ? 'var(--color-accent)' : 'var(--text-secondary)'} />
      <span style={{ fontSize: '14px', color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
    </div>
    <ChevronRight size={16} color={active ? 'var(--color-accent)' : 'var(--text-secondary)'} />
  </button>
);

export default function SystemPage() {
  const [activeTab, setActiveTab] = useState('integration');

  const tabs = [
    { id: 'integration', label: 'Integration', icon: Cpu },
    { id: 'memory', label: 'Memoire', icon: Database },
    { id: 'security', label: 'Securite', icon: Shield },
    { id: 'health', label: 'Sante', icon: Activity },
    { id: 'debug', label: 'Debug', icon: Bug },
  ];

  const cardStyle = {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid var(--border-primary)',
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Systeme</h1>
      <p style={{ margin: '4px 0 24px', fontSize: '13px', color: 'var(--text-muted)' }}>Configuration et monitoring du systeme</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: '24px'
      }}>
        {/* Sidebar Tabs */}
        <div style={{
          backgroundColor: 'var(--bg-panel)',
          borderRadius: '12px',
          padding: '12px',
          height: 'fit-content',
          border: '1px solid var(--border-primary)'
        }}>
          {tabs.map(tab => (
            <TabItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        {/* Content */}
        <div style={cardStyle}>
          {activeTab === 'integration' && <SystemIntegrationPanel />}
          {activeTab === 'memory' && <MemoryPanel />}
          {activeTab === 'security' && <SecurityPanel />}
          {activeTab === 'health' && <HealthMonitorPanel />}
          {activeTab === 'debug' && <DebugPanel />}
        </div>
      </div>
    </div>
  );
}
