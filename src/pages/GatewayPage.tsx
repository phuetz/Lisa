/**
 * Lisa Gateway Page
 * Central control panel for the Gateway system
 * Inspired by OpenClaw's Gateway architecture - AudioReader Studio design
 */

import { lazy, Suspense, useState } from 'react';
import {
  GatewayDashboard,
  ThemeSwitcher,
  NotificationToast,
  ShortcutsButton
} from '../components/gateway';

// Lazy-loaded panel components
const HealthDashboard = lazy(() => import('../components/gateway/HealthDashboard').then(m => ({ default: m.HealthDashboard })));
const ActivityPanel = lazy(() => import('../components/gateway/ActivityPanel').then(m => ({ default: m.ActivityPanel })));
const CachePanel = lazy(() => import('../components/gateway/CachePanel').then(m => ({ default: m.CachePanel })));
const ExportPanel = lazy(() => import('../components/gateway/ExportPanel').then(m => ({ default: m.ExportPanel })));
const BackupPanel = lazy(() => import('../components/gateway/BackupPanel').then(m => ({ default: m.BackupPanel })));
const SyncPanel = lazy(() => import('../components/gateway/SyncPanel').then(m => ({ default: m.SyncPanel })));
const AnalyticsDashboard = lazy(() => import('../components/gateway/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const ModelPanel = lazy(() => import('../components/gateway/ModelPanel').then(m => ({ default: m.ModelPanel })));
const QuickActionsPanel = lazy(() => import('../components/gateway/QuickActionsPanel').then(m => ({ default: m.QuickActionsPanel })));
const BrowserPanel = lazy(() => import('../components/gateway/BrowserPanel').then(m => ({ default: m.BrowserPanel })));
const TalkModePanel = lazy(() => import('../components/gateway/TalkModePanel').then(m => ({ default: m.TalkModePanel })));
const ScreenCapturePanel = lazy(() => import('../components/gateway/ScreenCapturePanel').then(m => ({ default: m.ScreenCapturePanel })));
const LocationPanel = lazy(() => import('../components/gateway/LocationPanel').then(m => ({ default: m.LocationPanel })));
const PermissionsPanel = lazy(() => import('../components/gateway/PermissionsPanel').then(m => ({ default: m.PermissionsPanel })));
const EmailPanel = lazy(() => import('../components/gateway/EmailPanel').then(m => ({ default: m.EmailPanel })));
const SkillsRegistryPanel = lazy(() => import('../components/gateway/SkillsRegistryPanel').then(m => ({ default: m.SkillsRegistryPanel })));
const DesktopPanel = lazy(() => import('../components/gateway/DesktopPanel').then(m => ({ default: m.DesktopPanel })));
const ChannelsPanel = lazy(() => import('../components/gateway/ChannelsPanel').then(m => ({ default: m.ChannelsPanel })));
const CompanionPanel = lazy(() => import('../components/gateway/CompanionPanel').then(m => ({ default: m.CompanionPanel })));

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
    <div style={{ padding: '24px', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Lisa Gateway</h1>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            OpenClaw-Inspired Control Center
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeSwitcher />
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '8px',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: isActive ? 'var(--color-accent)' : 'var(--bg-panel)',
                border: isActive ? 'none' : '1px solid var(--border-primary)',
                borderRadius: '8px',
                color: isActive ? 'var(--bg-deep)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>}>
        <div>{renderContent()}</div>
      </Suspense>

      {/* Floating components */}
      <NotificationToast position="top-right" />
      <ShortcutsButton />
    </div>
  );
}
