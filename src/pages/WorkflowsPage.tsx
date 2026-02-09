import { WorkflowManagerPanel } from '../components/WorkflowManagerPanel';
import { UserWorkflowPanel } from '../components/UserWorkflowPanel';
import { useIntentHandler } from '../hooks/useIntentHandler';
import { Workflow, User } from 'lucide-react';

export default function WorkflowsPage() {
  const { handleIntent } = useIntentHandler();

  const cardStyle = {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    border: '1px solid var(--border-primary)',
    overflow: 'hidden' as const,
  };

  const headerStyle = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '12px',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-primary)',
    backgroundColor: 'var(--bg-panel)',
  };

  const bodyStyle = {
    padding: '20px',
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Workflows</h1>
      <p style={{ margin: '4px 0 24px', fontSize: '13px', color: 'var(--text-muted)' }}>Gestion des workflows et automatisations</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
      }}>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <Workflow size={20} color={'var(--color-accent)'} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Workflow Manager
            </h3>
          </div>
          <div style={bodyStyle}>
            <WorkflowManagerPanel handleIntent={handleIntent} />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}>
            <User size={20} color={'var(--color-accent)'} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              User Workflows
            </h3>
          </div>
          <div style={bodyStyle}>
            <UserWorkflowPanel handleIntent={handleIntent} />
          </div>
        </div>
      </div>
    </div>
  );
}
