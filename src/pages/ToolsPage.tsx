import { useState } from 'react';
import CodeInterpreterPanel from '../components/CodeInterpreterPanel';
import GitHubPanel from '../components/GitHubPanel';
import PowerShellPanel from '../components/PowerShellPanel';
import ScreenSharePanel from '../components/ScreenSharePanel';
import { Code, Github, Terminal, Monitor, ChevronRight } from 'lucide-react';

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

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState('code');

  const tabs = [
    { id: 'code', label: 'Code Interpreter', icon: Code },
    { id: 'github', label: 'GitHub', icon: Github },
    { id: 'powershell', label: 'PowerShell', icon: Terminal },
    { id: 'screen', label: 'Screen Share', icon: Monitor },
  ];

  const cardStyle = {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid var(--border-primary)',
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Outils</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Outils de developpement et productivite</p>
      </div>
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
          {activeTab === 'code' && <CodeInterpreterPanel />}
          {activeTab === 'github' && <GitHubPanel />}
          {activeTab === 'powershell' && <PowerShellPanel />}
          {activeTab === 'screen' && <ScreenSharePanel />}
        </div>
      </div>
    </div>
  );
}
