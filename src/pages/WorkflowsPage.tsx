import { ModernLayout } from '../components/layout/ModernLayout';
import { ModernCard, ModernCardHeader, ModernCardBody } from '../components/ui/ModernCard';
import { WorkflowManagerPanel } from '../components/WorkflowManagerPanel';
import { UserWorkflowPanel } from '../components/UserWorkflowPanel';
import { useIntentHandler } from '../hooks/useIntentHandler';
import { Workflow, User } from 'lucide-react';

export default function WorkflowsPage() {
  const { handleIntent } = useIntentHandler();

  return (
    <ModernLayout title="Workflows">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard gradient hover>
          <ModernCardHeader title="Workflow Manager" icon={<Workflow />} />
          <ModernCardBody>
            <WorkflowManagerPanel handleIntent={handleIntent} />
          </ModernCardBody>
        </ModernCard>
        
        <ModernCard gradient hover>
          <ModernCardHeader title="User Workflows" icon={<User />} />
          <ModernCardBody>
            <UserWorkflowPanel handleIntent={handleIntent} />
          </ModernCardBody>
        </ModernCard>
      </div>
    </ModernLayout>
  );
}
