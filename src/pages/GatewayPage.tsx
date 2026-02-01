/**
 * Lisa Gateway Page
 * Central control panel for the Gateway system
 * Inspired by OpenClaw's Gateway architecture
 */

import { useState } from 'react';
import { 
  GatewayDashboard,
  HealthDashboard,
  ActivityPanel,
  CachePanel,
  ExportPanel,
  BackupPanel,
  SyncPanel,
  AnalyticsDashboard,
  ModelPanel,
  QuickActionsPanel,
  BrowserPanel,
  TalkModePanel,
  ScreenCapturePanel,
  LocationPanel,
  PermissionsPanel,
  EmailPanel,
  SkillsRegistryPanel,
  DesktopPanel,
  ChannelsPanel,
  CompanionPanel,
  ThemeSwitcher,
  NotificationToast,
  ShortcutsButton
} from '../components/gateway';

type TabId = 'overview' | 'health' | 'companion' | 'analytics' | 'models' | 'actions' | 'skills' | 'channels' | 'desktop' | 'browser' | 'talk' | 'capture' | 'location' | 'permissions' | 'email' | 'activity' | 'cache' | 'backup' | 'sync' | 'export';

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
  { id: 'health', label: 'Santé', icon: '💚' },
  { id: 'companion', label: 'Compagne', icon: '💕' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'models', label: 'Modèles', icon: '🤖' },
  { id: 'skills', label: 'Skills', icon: '📦' },
  { id: 'actions', label: 'Actions', icon: '⚡' },
  { id: 'channels', label: 'Channels', icon: '📡' },
  { id: 'desktop', label: 'Desktop', icon: '🖥️' },
  { id: 'browser', label: 'Browser', icon: '🌐' },
  { id: 'talk', label: 'Talk', icon: '🎤' },
  { id: 'capture', label: 'Capture', icon: '📸' },
  { id: 'location', label: 'Location', icon: '📍' },
  { id: 'permissions', label: 'Permissions', icon: '🔐' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'activity', label: 'Activité', icon: '📋' },
  { id: 'cache', label: 'Cache', icon: '💾' },
  { id: 'backup', label: 'Backup', icon: '💿' },
  { id: 'sync', label: 'Sync', icon: '🔄' },
  { id: 'export', label: 'Export', icon: '📤' }
];

export default function GatewayPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <GatewayDashboard />;
      case 'health':
        return <HealthDashboard />;
      case 'companion':
        return <CompanionPanel />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'models':
        return <ModelPanel />;
      case 'skills':
        return <SkillsRegistryPanel />;
      case 'actions':
        return <QuickActionsPanel />;
      case 'channels':
        return <ChannelsPanel />;
      case 'desktop':
        return <DesktopPanel />;
      case 'browser':
        return <BrowserPanel />;
      case 'talk':
        return <TalkModePanel />;
      case 'capture':
        return <ScreenCapturePanel />;
      case 'location':
        return <LocationPanel />;
      case 'permissions':
        return <PermissionsPanel />;
      case 'email':
        return <EmailPanel />;
      case 'activity':
        return <ActivityPanel />;
      case 'cache':
        return <CachePanel />;
      case 'backup':
        return <BackupPanel />;
      case 'sync':
        return <SyncPanel />;
      case 'export':
        return <ExportPanel />;
      default:
        return <GatewayDashboard />;
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>🌐 Lisa Gateway</h1>
          <span style={styles.subtitle}>OpenClaw-Inspired Control Center</span>
        </div>
        <div style={styles.headerRight}>
          <ThemeSwitcher />
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {})
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {renderContent()}
      </div>

      {/* Floating components */}
      <NotificationToast position="top-right" />
      <ShortcutsButton />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#fff',
    padding: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #222'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '16px'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700
  },
  subtitle: {
    fontSize: '14px',
    color: '#666'
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    overflowX: 'auto',
    paddingBottom: '8px'
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#1a1a1a',
    border: 'none',
    borderRadius: '8px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s'
  },
  tabActive: {
    backgroundColor: '#3b82f6',
    color: '#fff'
  },
  content: {
    flex: 1
  }
};
