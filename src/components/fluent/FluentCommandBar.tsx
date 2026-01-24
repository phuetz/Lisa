/**
 * FluentCommandBar - Barre d'outils style Office 365
 * Ribbon simplifié avec boutons iconiques et overflow
 */

import React, { useState, useRef, useEffect } from 'react';
import { fluentMotion, fluentBorderRadius, fluentColors, fluentTypography, fluentSpacing, fluentElevation } from '../../styles/fluentTokens';

export interface FluentCommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  checked?: boolean;
  type?: 'button' | 'toggle' | 'divider';
  tooltip?: string;
}

export interface FluentCommandGroup {
  id: string;
  label?: string;
  items: FluentCommandItem[];
}

export interface FluentCommandBarProps {
  groups: FluentCommandGroup[];
  farItems?: FluentCommandItem[];
  search?: {
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
  };
  className?: string;
  style?: React.CSSProperties;
}

const FluentCommandBar: React.FC<FluentCommandBarProps> = ({
  groups,
  farItems,
  search,
  className = '',
  style,
}) => {
  const [overflowItems, setOverflowItems] = useState<FluentCommandItem[]>([]);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close overflow menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node)) {
        setShowOverflowMenu(false);
      }
    };

    if (showOverflowMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOverflowMenu]);

  const barStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: '44px',
    padding: `0 ${fluentSpacing.m}`,
    background: `var(--color-bg-secondary, ${fluentColors.neutral.surface})`,
    borderBottom: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
    fontFamily: fluentTypography.fontFamily,
    gap: fluentSpacing.xs,
    ...style,
  };

  const groupStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: fluentSpacing.xs,
    padding: `0 ${fluentSpacing.s}`,
  };

  const dividerStyle: React.CSSProperties = {
    width: '1px',
    height: '24px',
    background: `var(--color-border, ${fluentColors.neutral.divider})`,
    margin: `0 ${fluentSpacing.xs}`,
  };

  const buttonStyle = (item: FluentCommandItem): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: fluentSpacing.xs,
    padding: `${fluentSpacing.xs} ${fluentSpacing.s}`,
    height: '32px',
    minWidth: '32px',
    background: item.checked ? `var(--color-accent-muted, ${fluentColors.primary.subtle})` : 'transparent',
    border: 'none',
    borderRadius: fluentBorderRadius.medium,
    color: item.checked
      ? `var(--color-accent, ${fluentColors.primary.light})`
      : `var(--color-text-primary, ${fluentColors.neutral.text})`,
    cursor: item.disabled ? 'not-allowed' : 'pointer',
    opacity: item.disabled ? 0.5 : 1,
    transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
    fontSize: fluentTypography.sizes.caption,
    fontWeight: fluentTypography.weights.regular,
    whiteSpace: 'nowrap',
  });

  const iconStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
  };

  const searchStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: fluentSpacing.xs,
    padding: `${fluentSpacing.xs} ${fluentSpacing.m}`,
    height: '32px',
    background: `var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover})`,
    borderRadius: fluentBorderRadius.medium,
    border: 'none',
    marginLeft: 'auto',
    minWidth: '200px',
  };

  const searchInputStyle: React.CSSProperties = {
    flex: 1,
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: fluentTypography.sizes.body,
    fontFamily: fluentTypography.fontFamily,
    color: `var(--color-text-primary, ${fluentColors.neutral.text})`,
  };

  const overflowButtonStyle: React.CSSProperties = {
    display: overflowItems.length > 0 ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    background: 'transparent',
    border: 'none',
    borderRadius: fluentBorderRadius.medium,
    cursor: 'pointer',
  };

  const overflowMenuStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: fluentSpacing.m,
    marginTop: fluentSpacing.xs,
    background: `var(--color-bg-secondary, ${fluentColors.neutral.surface})`,
    borderRadius: fluentBorderRadius.large,
    boxShadow: fluentElevation.dialog,
    border: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
    padding: fluentSpacing.xs,
    minWidth: '180px',
    zIndex: 1000,
  };

  const overflowItemStyle = (item: FluentCommandItem): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: fluentSpacing.m,
    padding: `${fluentSpacing.s} ${fluentSpacing.m}`,
    borderRadius: fluentBorderRadius.medium,
    cursor: item.disabled ? 'not-allowed' : 'pointer',
    opacity: item.disabled ? 0.5 : 1,
    background: item.checked ? `var(--color-accent-muted, ${fluentColors.primary.subtle})` : 'transparent',
    color: item.checked
      ? `var(--color-accent, ${fluentColors.primary.light})`
      : `var(--color-text-primary, ${fluentColors.neutral.text})`,
    fontSize: fluentTypography.sizes.body,
    transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
  });

  const renderCommandItem = (item: FluentCommandItem) => {
    if (item.type === 'divider') {
      return <div key={item.id} style={dividerStyle} />;
    }

    return (
      <button
        key={item.id}
        className="fluent-command-item"
        style={buttonStyle(item)}
        onClick={item.onClick}
        disabled={item.disabled}
        title={item.tooltip || item.label}
        aria-pressed={item.type === 'toggle' ? item.checked : undefined}
      >
        <span style={iconStyle}>{item.icon}</span>
        <span className="fluent-command-label">{item.label}</span>
      </button>
    );
  };

  return (
    <div ref={containerRef} className={`fluent-command-bar ${className}`} style={barStyle}>
      {groups.map((group, index) => (
        <React.Fragment key={group.id}>
          <div className="fluent-command-group" style={groupStyle}>
            {group.items.map(renderCommandItem)}
          </div>
          {index < groups.length - 1 && <div style={dividerStyle} />}
        </React.Fragment>
      ))}

      <div style={{ flex: 1 }} />

      {search && (
        <div style={searchStyle}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            placeholder={search.placeholder || 'Search...'}
            value={search.value}
            onChange={(e) => search.onChange?.(e.target.value)}
            style={searchInputStyle}
          />
        </div>
      )}

      {farItems && (
        <div style={{ ...groupStyle, marginLeft: search ? fluentSpacing.m : 'auto' }}>
          {farItems.map(renderCommandItem)}
        </div>
      )}

      <div style={{ position: 'relative' }} ref={overflowMenuRef}>
        <button
          style={overflowButtonStyle}
          onClick={() => setShowOverflowMenu(!showOverflowMenu)}
          aria-label="More options"
          aria-expanded={showOverflowMenu}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>

        {showOverflowMenu && overflowItems.length > 0 && (
          <div style={overflowMenuStyle} className="fluent-overflow-menu fluent-dialog-enter">
            {overflowItems.map((item) => (
              <div
                key={item.id}
                className="fluent-overflow-item"
                style={overflowItemStyle(item)}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick?.();
                    setShowOverflowMenu(false);
                  }
                }}
                role="button"
                tabIndex={item.disabled ? -1 : 0}
              >
                <span style={iconStyle}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .fluent-command-item:hover:not(:disabled) {
          background: var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover}) !important;
        }
        .fluent-command-item:active:not(:disabled) {
          transform: scale(0.98);
        }
        .fluent-command-label {
          display: none;
        }
        @media (min-width: 768px) {
          .fluent-command-label {
            display: inline;
          }
        }
        .fluent-overflow-item:hover {
          background: var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover}) !important;
        }
      `}</style>
    </div>
  );
};

export default FluentCommandBar;
