/**
 * Office Page Layout Component
 * Simplified content wrapper - sidebar/topbar provided by MainLayout
 * Provides consistent page header with title + subtitle + action area
 */

import React from 'react';

interface OfficePageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showSidebar?: boolean;
  action?: React.ReactNode;
  headerContent?: React.ReactNode;
}

export const OfficePageLayout: React.FC<OfficePageLayoutProps> = ({
  children,
  title,
  subtitle,
  action,
  headerContent,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-deep)',
      color: 'var(--text-primary)',
    }}>
      {/* Page header */}
      {(title || action || headerContent) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          minHeight: 56,
        }}>
          <div>
            {title && (
              <h1 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p style={{
                margin: '2px 0 0',
                fontSize: '13px',
                color: 'var(--text-muted)',
              }}>
                {subtitle}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {headerContent || action}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '24px',
      }}>
        {children}
      </div>
    </div>
  );
};

export default OfficePageLayout;
