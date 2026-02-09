/**
 * GrokCliPage
 * Page dediee a l'interface grok-cli dans Lisa
 */

import React from 'react';
import { GrokCliPanel } from '../components/GrokCliPanel';

export const GrokCliPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Grok CLI</h1>
      <p style={{ margin: '4px 0 24px', fontSize: '13px', color: 'var(--text-muted)' }}>Interface ligne de commande Grok</p>

      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-primary)',
        height: 'calc(100vh - 200px)',
        overflow: 'hidden'
      }}>
        <GrokCliPanel />
      </div>
    </div>
  );
};

export default GrokCliPage;
