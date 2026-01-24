/**
 * FluentSidebar - Navigation verticale style Office 365
 */

import React, { useState } from 'react';
import { fluentMotion, fluentBorderRadius, fluentColors, fluentTypography, fluentSpacing, fluentElevation } from '../../styles/fluentTokens';

export interface FluentSidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  onClick?: () => void;
  disabled?: boolean;
  children?: FluentSidebarItem[];
}

export interface FluentSidebarSection {
  id: string;
  title?: string;
  items: FluentSidebarItem[];
  collapsible?: boolean;
}

export interface FluentSidebarProps {
  sections: FluentSidebarSection[];
  activeItemId?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  collapsedWidth?: number;
}

const FluentSidebar: React.FC<FluentSidebarProps> = ({
  sections,
  activeItemId,
  collapsed = false,
  onCollapsedChange,
  header,
  footer,
  width = 280,
  collapsedWidth = 48,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const sidebarStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: collapsed ? collapsedWidth : width,
    height: '100%',
    background: `var(--color-bg-secondary, ${fluentColors.neutral.surface})`,
    borderRight: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
    transition: `width ${fluentMotion.duration.normal} ${fluentMotion.easing.standard}`,
    overflow: 'hidden',
    fontFamily: fluentTypography.fontFamily,
  };

  const headerStyle: React.CSSProperties = {
    padding: collapsed ? fluentSpacing.s : fluentSpacing.l,
    borderBottom: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'space-between',
    minHeight: '56px',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: `${fluentSpacing.s} 0`,
  };

  const footerStyle: React.CSSProperties = {
    padding: collapsed ? fluentSpacing.s : fluentSpacing.m,
    borderTop: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: fluentSpacing.s,
  };

  const sectionTitleStyle: React.CSSProperties = {
    padding: `${fluentSpacing.s} ${fluentSpacing.l}`,
    fontSize: fluentTypography.sizes.caption,
    fontWeight: fluentTypography.weights.semibold,
    color: `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: collapsed ? 'none' : 'block',
  };

  const renderItem = (item: FluentSidebarItem, depth = 0) => {
    const isActive = activeItemId === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.id);

    const itemStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: fluentSpacing.m,
      padding: collapsed ? `${fluentSpacing.m} ${fluentSpacing.s}` : `${fluentSpacing.m} ${fluentSpacing.l}`,
      paddingLeft: collapsed ? fluentSpacing.s : `calc(${fluentSpacing.l} + ${depth * 16}px)`,
      margin: `0 ${fluentSpacing.s}`,
      borderRadius: fluentBorderRadius.medium,
      cursor: item.disabled ? 'not-allowed' : 'pointer',
      opacity: item.disabled ? 0.5 : 1,
      background: isActive ? `var(--color-accent-muted, ${fluentColors.primary.subtle})` : 'transparent',
      color: isActive
        ? `var(--color-accent, ${fluentColors.primary.light})`
        : `var(--color-text-primary, ${fluentColors.neutral.text})`,
      transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
      justifyContent: collapsed ? 'center' : 'flex-start',
      position: 'relative',
    };

    const iconStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '20px',
      height: '20px',
      flexShrink: 0,
    };

    const labelStyle: React.CSSProperties = {
      flex: 1,
      fontSize: fluentTypography.sizes.body,
      fontWeight: isActive ? fluentTypography.weights.semibold : fluentTypography.weights.regular,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: collapsed ? 'none' : 'block',
    };

    const badgeStyle: React.CSSProperties = {
      padding: '2px 6px',
      fontSize: fluentTypography.sizes.caption2,
      fontWeight: fluentTypography.weights.semibold,
      background: `var(--color-accent, ${fluentColors.primary.light})`,
      color: '#ffffff',
      borderRadius: fluentBorderRadius.circular,
      minWidth: '18px',
      textAlign: 'center',
      display: collapsed ? 'none' : 'inline-block',
    };

    const chevronStyle: React.CSSProperties = {
      display: collapsed || !hasChildren ? 'none' : 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '16px',
      height: '16px',
      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: `transform ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
    };

    const handleClick = () => {
      if (item.disabled) return;
      if (hasChildren) {
        toggleSection(item.id);
      }
      item.onClick?.();
    };

    return (
      <React.Fragment key={item.id}>
        <div
          className="fluent-sidebar-item fluent-reveal"
          style={itemStyle}
          onClick={handleClick}
          role="button"
          tabIndex={item.disabled ? -1 : 0}
          aria-current={isActive ? 'page' : undefined}
          aria-disabled={item.disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
        >
          <span style={iconStyle}>{item.icon}</span>
          <span style={labelStyle}>{item.label}</span>
          {item.badge && <span style={badgeStyle}>{item.badge}</span>}
          {hasChildren && (
            <span style={chevronStyle}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </span>
          )}
        </div>
        {hasChildren && isExpanded && !collapsed && (
          <div className="fluent-sidebar-children">{item.children!.map((child) => renderItem(child, depth + 1))}</div>
        )}
        <style>{`
          .fluent-sidebar-item:hover:not([aria-disabled="true"]) {
            background: var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover}) !important;
          }
          .fluent-sidebar-item:focus-visible {
            outline: 2px solid var(--color-accent, ${fluentColors.primary.light});
            outline-offset: -2px;
          }
        `}</style>
      </React.Fragment>
    );
  };

  return (
    <nav style={sidebarStyle} className="fluent-sidebar" aria-label="Sidebar navigation">
      {header && <div style={headerStyle}>{header}</div>}

      <div style={contentStyle}>
        {sections.map((section) => (
          <div key={section.id} style={sectionStyle}>
            {section.title && <div style={sectionTitleStyle}>{section.title}</div>}
            {section.items.map((item) => renderItem(item))}
          </div>
        ))}
      </div>

      {footer && <div style={footerStyle}>{footer}</div>}

      {onCollapsedChange && (
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          style={{
            position: 'absolute',
            bottom: '16px',
            right: collapsed ? '50%' : '16px',
            transform: collapsed ? 'translateX(50%)' : 'none',
            width: '32px',
            height: '32px',
            borderRadius: fluentBorderRadius.circular,
            background: `var(--color-bg-secondary, ${fluentColors.neutral.surface})`,
            border: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
            boxShadow: fluentElevation.rest,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
          }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: `transform ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
            }}
          >
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
      )}
    </nav>
  );
};

export default FluentSidebar;
