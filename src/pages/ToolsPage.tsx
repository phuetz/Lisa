import { useState } from 'react';
import { OfficePageLayout } from '../components/layout/OfficePageLayout';
import { useOfficeThemeStore } from '../store/officeThemeStore';
import CodeInterpreterPanel from '../components/CodeInterpreterPanel';
import GitHubPanel from '../components/GitHubPanel';
import PowerShellPanel from '../components/PowerShellPanel';
import ScreenSharePanel from '../components/ScreenSharePanel';
import { Code, Github, Terminal, Monitor, ChevronRight } from 'lucide-react';

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
}

const TabItem = ({
  icon: Icon,
  label,
  active,
  onClick,
  colors
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  colors: ThemeColors;
}) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      backgroundColor: active ? colors.sidebarActive : 'transparent',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      marginBottom: '4px',
      transition: 'all 0.2s ease'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Icon size={20} color={active ? colors.accent : colors.editorSecondary} />
      <span style={{ fontSize: '14px', color: active ? colors.editorText : colors.editorSecondary }}>{label}</span>
    </div>
    <ChevronRight size={16} color={active ? colors.accent : colors.editorSecondary} />
  </button>
);

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState('code');

  const { getCurrentColors } = useOfficeThemeStore();
  const colors = getCurrentColors();

  const tabs = [
    { id: 'code', label: 'Code Interpreter', icon: Code },
    { id: 'github', label: 'GitHub', icon: Github },
    { id: 'powershell', label: 'PowerShell', icon: Terminal },
    { id: 'screen', label: 'Screen Share', icon: Monitor },
  ];

  const cardStyle = {
    backgroundColor: colors.dialog,
    borderRadius: '12px',
    padding: '20px',
    border: `1px solid ${colors.border}`,
  };

  return (
    <OfficePageLayout
      title="Outils"
      subtitle="Outils de developpement et productivite"
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: '24px'
      }}>
        {/* Sidebar Tabs */}
        <div style={{
          backgroundColor: colors.sidebar,
          borderRadius: '12px',
          padding: '12px',
          height: 'fit-content',
          border: `1px solid ${colors.border}`
        }}>
          {tabs.map(tab => (
            <TabItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              colors={colors}
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
    </OfficePageLayout>
  );
}
