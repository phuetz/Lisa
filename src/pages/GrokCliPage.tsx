/**
 * GrokCliPage
 * Page dediee a l'interface grok-cli dans Lisa
 */

import React from 'react';
import { OfficePageLayout } from '../components/layout/OfficePageLayout';
import { useOfficeThemeStore } from '../store/officeThemeStore';
import { GrokCliPanel } from '../components/GrokCliPanel';

export const GrokCliPage: React.FC = () => {
  const { getCurrentColors } = useOfficeThemeStore();
  const colors = getCurrentColors();

  return (
    <OfficePageLayout
      title="Grok CLI"
      subtitle="Interface ligne de commande Grok"
    >
      <div style={{
        backgroundColor: colors.dialog,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        height: 'calc(100vh - 200px)',
        overflow: 'hidden'
      }}>
        <GrokCliPanel />
      </div>
    </OfficePageLayout>
  );
};

export default GrokCliPage;
