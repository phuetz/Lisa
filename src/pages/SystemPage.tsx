import { ModernLayout } from '../components/layout/ModernLayout';
import { ModernCard, ModernCardBody } from '../components/ui/ModernCard';
import { ModernTabs } from '../components/ui/ModernTabs';
import SystemIntegrationPanel from '../components/SystemIntegrationPanel';
import MemoryPanel from '../components/MemoryPanel';
import DebugPanel from '../components/DebugPanel';
import { SecurityPanel } from '../components/SecurityPanel';
import { HealthMonitorPanel } from '../components/HealthMonitorPanel';
import { Cpu, Database, Bug, Shield, Activity } from 'lucide-react';

export default function SystemPage() {
  return (
    <ModernLayout title="Système">
      <ModernTabs
        variant="pills"
        tabs={[
          {
            id: 'integration',
            label: 'Intégration',
            icon: <Cpu size={18} />,
            content: (
              <ModernCard gradient>
                <ModernCardBody>
                  <SystemIntegrationPanel />
                </ModernCardBody>
              </ModernCard>
            ),
          },
          {
            id: 'memory',
            label: 'Mémoire',
            icon: <Database size={18} />,
            content: (
              <ModernCard gradient>
                <ModernCardBody>
                  <MemoryPanel />
                </ModernCardBody>
              </ModernCard>
            ),
          },
          {
            id: 'security',
            label: 'Sécurité',
            icon: <Shield size={18} />,
            content: (
              <ModernCard gradient>
                <ModernCardBody>
                  <SecurityPanel />
                </ModernCardBody>
              </ModernCard>
            ),
          },
          {
            id: 'health',
            label: 'Santé',
            icon: <Activity size={18} />,
            content: (
              <ModernCard gradient>
                <ModernCardBody>
                  <HealthMonitorPanel />
                </ModernCardBody>
              </ModernCard>
            ),
          },
          {
            id: 'debug',
            label: 'Debug',
            icon: <Bug size={18} />,
            content: (
              <ModernCard gradient>
                <ModernCardBody>
                  <DebugPanel />
                </ModernCardBody>
              </ModernCard>
            ),
          },
        ]}
      />
    </ModernLayout>
  );
}
