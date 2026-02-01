import { OfficePageLayout } from '../components/layout/OfficePageLayout';
import { useOfficeThemeStore } from '../store/officeThemeStore';
import { WorkflowManagerPanel } from '../components/WorkflowManagerPanel';
import { UserWorkflowPanel } from '../components/UserWorkflowPanel';
import { useIntentHandler } from '../hooks/useIntentHandler';
import { Workflow, User } from 'lucide-react';

export default function WorkflowsPage() {
  const { handleIntent } = useIntentHandler();
  const { getCurrentColors } = useOfficeThemeStore();
  const colors = getCurrentColors();

  const cardStyle = {
    backgroundColor: colors.dialog,
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    overflow: 'hidden',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.sidebar,
  };

  const bodyStyle = {
    padding: '20px',
  };

  return (
    <OfficePageLayout
      title="Workflows"
      subtitle="Gestion des workflows et automatisations"
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
      }}>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <Workflow size={20} color={colors.accent} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: colors.editorText }}>
              Workflow Manager
            </h3>
          </div>
          <div style={bodyStyle}>
            <WorkflowManagerPanel handleIntent={handleIntent} />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}>
            <User size={20} color={colors.accent} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: colors.editorText }}>
              User Workflows
            </h3>
          </div>
          <div style={bodyStyle}>
            <UserWorkflowPanel handleIntent={handleIntent} />
          </div>
        </div>
      </div>
    </OfficePageLayout>
  );
}
