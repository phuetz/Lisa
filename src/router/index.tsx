import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import App from '../App';
import LoadingFallback from '../components/LoadingFallback';

// Lazy load pages for optimal performance and code splitting
const ChatPage = lazy(() => import('../pages/ChatPage'));

// Future flags for React Router v7 compatibility
const FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const AgentsPage = lazy(() => import('../pages/AgentsPage'));
const VisionPage = lazy(() => import('../pages/VisionPage'));
const AudioPage = lazy(() => import('../pages/AudioPage'));
const WorkflowsPage = lazy(() => import('../pages/WorkflowsPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const SystemPage = lazy(() => import('../pages/SystemPage'));
const ToolsPage = lazy(() => import('../pages/ToolsPage'));
const SmartHomePage = lazy(() => import('../pages/SmartHomePage'));
const HealthPage = lazy(() => import('../pages/HealthPage'));
const DocumentsPage = lazy(() => import('../pages/DocumentsPage'));
const CodeAssistantPage = lazy(() => import('../pages/CodeAssistantPage'));
const CodePlayground = lazy(() => import('../pages/CodePlayground'));
const NotebookPage = lazy(() => import('../pages/NotebookPage'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/chat" replace />,
      },
      {
        path: 'chat',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ChatPage />
          </Suspense>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'agents',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AgentsPage />
          </Suspense>
        ),
      },
      {
        path: 'vision',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <VisionPage />
          </Suspense>
        ),
      },
      {
        path: 'audio',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AudioPage />
          </Suspense>
        ),
      },
      {
        path: 'workflows',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <WorkflowsPage />
          </Suspense>
        ),
      },
      {
        path: 'tools',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ToolsPage />
          </Suspense>
        ),
      },
      {
        path: 'system',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <SystemPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: 'smart-home',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <SmartHomePage />
          </Suspense>
        ),
      },
      {
        path: 'health',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <HealthPage />
          </Suspense>
        ),
      },
      {
        path: 'documents',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <DocumentsPage />
          </Suspense>
        ),
      },
      {
        path: 'code-assistant',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <CodeAssistantPage />
          </Suspense>
        ),
      },
      {
        path: 'code',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <CodePlayground />
          </Suspense>
        ),
      },
      {
        path: 'notebook',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <NotebookPage />
          </Suspense>
        ),
      },
    ],
  },
], {
  future: FUTURE_FLAGS,
});
