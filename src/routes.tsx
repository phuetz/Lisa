/**
 * 🚀 Routes de l'Application Lisa
 * Routes principales incluant le Manifeste Vivant
 */

import type { RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import App from './App';
import { SensorPermissionsPanel } from './components/SensorPermissionsPanel';
import { PrivacyCenter } from './components/PrivacyCenter';
import { MemoryMap } from './components/MemoryMap';
import { IncarnationDashboard } from './components/IncarnationDashboard';
import { Phase2Dashboard } from './components/Phase2Dashboard';
import { Phase3Dashboard } from './components/Phase3Dashboard';
import { LisaVivanteComplete } from './components/LisaVivanteComplete';
import { AccessibilitySettings } from './components/AccessibilitySettings';
import { MonitoringPage } from './pages/MonitoringPage';

// IT-002: Beautiful pages removed - using unified Office theme system
// See OfficePageLayout for the new unified styling approach

// Import lazy des pages 5 Sens
const SensesDashboard = lazy(() => import('./components/SensesDashboard'));

// Import lazy de la page Personas
const PersonaPage = lazy(() => import('./pages/PersonaPage'));

// Import lazy de la page Grok CLI
const GrokCliPage = lazy(() => import('./pages/GrokCliPage'));

// Import lazy des pages Gateway (OpenClaw-inspired)
const GatewayPage = lazy(() => import('./pages/GatewayPage'));
const SkillsPage = lazy(() => import('./pages/SkillsPage'));
const AutomationPage = lazy(() => import('./pages/AutomationPage'));

// Import lazy de la page Chat
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ChatPageMobile = lazy(() => import('./pages/ChatPageMobile'));

// Import lazy de la Landing Page
const LandingPage = lazy(() => import('./pages/LandingPage'));

// Import lazy des pages principales
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const VisionPage = lazy(() => import('./pages/VisionPage'));
const AudioPage = lazy(() => import('./pages/AudioPage'));
const WorkflowsPage = lazy(() => import('./pages/WorkflowsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SystemPage = lazy(() => import('./pages/SystemPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const HealthPage = lazy(() => import('./pages/HealthPage'));
const NotebookPage = lazy(() => import('./pages/NotebookPage'));
const SmartHomePage = lazy(() => import('./pages/SmartHomePage'));
const ToolsPage = lazy(() => import('./pages/ToolsPage'));
const CodeAssistantPage = lazy(() => import('./pages/CodeAssistantPage'));
const CodePlayground = lazy(() => import('./pages/CodePlayground'));
const FluentDemoPage = lazy(() => import('./pages/FluentDemoPage'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-slate-400">Chargement...</p>
    </div>
  </div>
);

// Import des pages existantes - à implémenter

export const routes: RouteObject[] = [
  // Landing Page - accessible sans authentification
  {
    path: '/landing',
    element: <Suspense fallback={<PageLoader />}><LandingPage /></Suspense>,
  },
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Suspense fallback={<PageLoader />}><ChatPage /></Suspense>,
      },
      {
        path: 'chat',
        element: <Suspense fallback={<PageLoader />}><ChatPageMobile /></Suspense>,
      },
      {
        path: 'lisa-vivante',
        element: <LisaVivanteComplete />,
      },
      {
        path: 'incarnation-dashboard',
        element: <IncarnationDashboard />,
      },
      // Routes Manifeste Vivant - Phase 1
      {
        path: 'permissions',
        element: <SensorPermissionsPanel />,
      },
      {
        path: 'privacy',
        element: <PrivacyCenter />,
      },
      {
        path: 'memory',
        element: <MemoryMap />,
      },
      {
        path: 'incarnation',
        element: <IncarnationDashboard />,
      },
      {
        path: 'accessibility',
        element: <AccessibilitySettings />,
      },
      // Routes Manifeste Vivant - Phase 2
      {
        path: 'agentivity',
        element: <Phase2Dashboard />,
      },
      // Routes Manifeste Vivant - Phase 3
      {
        path: 'autonomy',
        element: <Phase3Dashboard />,
      },
      // Routes Infrastructure
      {
        path: 'monitoring',
        element: <MonitoringPage />,
      },
      // Route 5 Sens
      {
        path: 'senses',
        element: <Suspense fallback={<PageLoader />}><SensesDashboard /></Suspense>,
      },
      // Route Personas
      {
        path: 'personas',
        element: <Suspense fallback={<PageLoader />}><PersonaPage /></Suspense>,
      },
      // Route Grok CLI
      {
        path: 'grok-cli',
        element: <Suspense fallback={<PageLoader />}><GrokCliPage /></Suspense>,
      },
      // Routes Gateway (OpenClaw-inspired)
      {
        path: 'gateway',
        element: <Suspense fallback={<PageLoader />}><GatewayPage /></Suspense>,
      },
      {
        path: 'skills',
        element: <Suspense fallback={<PageLoader />}><SkillsPage /></Suspense>,
      },
      {
        path: 'automation',
        element: <Suspense fallback={<PageLoader />}><AutomationPage /></Suspense>,
      },
      // Routes principales
      {
        path: 'dashboard',
        element: <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>,
      },
      {
        path: 'agents',
        element: <Suspense fallback={<PageLoader />}><AgentsPage /></Suspense>,
      },
      {
        path: 'vision',
        element: <Suspense fallback={<PageLoader />}><VisionPage /></Suspense>,
      },
      {
        path: 'audio',
        element: <Suspense fallback={<PageLoader />}><AudioPage /></Suspense>,
      },
      {
        path: 'workflows',
        element: <Suspense fallback={<PageLoader />}><WorkflowsPage /></Suspense>,
      },
      {
        path: 'settings',
        element: <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>,
      },
      {
        path: 'system',
        element: <Suspense fallback={<PageLoader />}><SystemPage /></Suspense>,
      },
      // Route Fluent Design Demo
      {
        path: 'fluent-demo',
        element: <Suspense fallback={<PageLoader />}><FluentDemoPage /></Suspense>,
      },
      {
        path: 'documents',
        element: <Suspense fallback={<PageLoader />}><DocumentsPage /></Suspense>,
      },
      {
        path: 'health',
        element: <Suspense fallback={<PageLoader />}><HealthPage /></Suspense>,
      },
      {
        path: 'notebook',
        element: <Suspense fallback={<PageLoader />}><NotebookPage /></Suspense>,
      },
      {
        path: 'smart-home',
        element: <Suspense fallback={<PageLoader />}><SmartHomePage /></Suspense>,
      },
      {
        path: 'tools',
        element: <Suspense fallback={<PageLoader />}><ToolsPage /></Suspense>,
      },
      {
        path: 'code-assistant',
        element: <Suspense fallback={<PageLoader />}><CodeAssistantPage /></Suspense>,
      },
      {
        path: 'playground',
        element: <Suspense fallback={<PageLoader />}><CodePlayground /></Suspense>,
      },
      
      // IT-002: Beautiful routes removed - using unified Office theme
      // Old *-beautiful routes now redirect to main pages with Office styling
    ],
  },
];

export default routes;
