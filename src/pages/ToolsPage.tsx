import { ModernLayout } from '../components/layout/ModernLayout';
import { ModernCard, ModernCardBody } from '../components/ui/ModernCard';
import { ModernTabs } from '../components/ui/ModernTabs';
import CodeInterpreterPanel from '../components/CodeInterpreterPanel';
import GitHubPanel from '../components/GitHubPanel';
import PowerShellPanel from '../components/PowerShellPanel';
import ScreenSharePanel from '../components/ScreenSharePanel';
import { Code, Github, Terminal, Monitor } from 'lucide-react';

export default function ToolsPage() {
  return (
    <ModernLayout title="Outils">
      <ModernTabs
        tabs={[
          {
            id: 'code',
            label: 'Code Interpreter',
            icon: <Code size={18} />,
            content: (
              <ModernCard gradient>
                <ModernCardBody>
                  <CodeInterpreterPanel />
                </ModernCardBody>
              </ModernCard>
            ),
          },
          {
            id: 'github',
            label: 'GitHub',
            icon: <Github size={18} />,
            content: (
              <ModernCard gradient>
                <ModernCardBody>
                  <GitHubPanel />
                </ModernCardBody>
              </ModernCard>
            ),
          },
          {
            id: 'powershell',
            label: 'PowerShell',
            icon: <Terminal size={18} />,
            content: (
              <ModernCard gradient>
                <ModernCardBody>
                  <PowerShellPanel />
                </ModernCardBody>
              </ModernCard>
            ),
          },
          {
            id: 'screen',
            label: 'Screen Share',
            icon: <Monitor size={18} />,
            content: (
              <ModernCard gradient>
                <ModernCardBody>
                  <ScreenSharePanel />
                </ModernCardBody>
              </ModernCard>
            ),
          },
        ]}
      />
    </ModernLayout>
  );
}
