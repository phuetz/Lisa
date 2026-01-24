/**
 * FluentConversationList - Liste de conversations style Outlook
 * Aperçu 2 lignes, avatar, timestamp, indicateur non lu
 */

import React, { useState, useCallback } from 'react';
import { fluentMotion, fluentBorderRadius, fluentColors, fluentTypography, fluentSpacing } from '../../styles/fluentTokens';

export interface FluentConversationItem {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  avatar?: string;
  unreadCount?: number;
  pinned?: boolean;
  muted?: boolean;
  online?: boolean;
}

export interface FluentConversationListProps {
  conversations: FluentConversationItem[];
  selectedId?: string;
  onSelect?: (conversation: FluentConversationItem) => void;
  onPin?: (id: string) => void;
  onMute?: (id: string) => void;
  onDelete?: (id: string) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  emptyMessage?: string;
  className?: string;
  style?: React.CSSProperties;
}

const FluentConversationList: React.FC<FluentConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  onPin,
  onMute,
  onDelete,
  searchValue = '',
  onSearchChange,
  emptyMessage = 'No conversations yet',
  className = '',
  style,
}) => {
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ id, x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchValue.toLowerCase())
  );

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: `var(--color-bg-secondary, ${fluentColors.neutral.surface})`,
    fontFamily: fluentTypography.fontFamily,
    ...style,
  };

  const searchContainerStyle: React.CSSProperties = {
    padding: fluentSpacing.m,
    borderBottom: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
  };

  const searchInputStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: fluentSpacing.s,
    padding: `${fluentSpacing.s} ${fluentSpacing.m}`,
    background: `var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover})`,
    borderRadius: fluentBorderRadius.medium,
    border: 'none',
  };

  const listStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  };

  const itemStyle = (isSelected: boolean, hasUnread: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: fluentSpacing.m,
    padding: `${fluentSpacing.m} ${fluentSpacing.l}`,
    cursor: 'pointer',
    background: isSelected
      ? `var(--color-accent-muted, ${fluentColors.primary.subtle})`
      : 'transparent',
    borderLeft: isSelected
      ? `3px solid var(--color-accent, ${fluentColors.primary.light})`
      : '3px solid transparent',
    transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
    position: 'relative',
  });

  const avatarStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: fluentBorderRadius.circular,
    background: `var(--color-accent, ${fluentColors.primary.light})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: fluentTypography.sizes.body,
    fontWeight: fluentTypography.weights.semibold,
    color: '#ffffff',
    flexShrink: 0,
    overflow: 'hidden',
    position: 'relative',
  };

  const onlineIndicatorStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '12px',
    height: '12px',
    borderRadius: fluentBorderRadius.circular,
    background: fluentColors.semantic.success,
    border: `2px solid var(--color-bg-secondary, ${fluentColors.neutral.surface})`,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: fluentSpacing.xs,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: fluentSpacing.s,
  };

  const titleStyle = (hasUnread: boolean): React.CSSProperties => ({
    fontSize: fluentTypography.sizes.body,
    fontWeight: hasUnread ? fluentTypography.weights.semibold : fluentTypography.weights.regular,
    color: `var(--color-text-primary, ${fluentColors.neutral.text})`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  });

  const timestampStyle: React.CSSProperties = {
    fontSize: fluentTypography.sizes.caption,
    color: `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
    flexShrink: 0,
  };

  const messageStyle = (hasUnread: boolean): React.CSSProperties => ({
    fontSize: fluentTypography.sizes.caption,
    color: hasUnread
      ? `var(--color-text-primary, ${fluentColors.neutral.text})`
      : `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
    fontWeight: hasUnread ? fluentTypography.weights.medium : fluentTypography.weights.regular,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  });

  const badgeStyle: React.CSSProperties = {
    minWidth: '18px',
    height: '18px',
    padding: '0 6px',
    borderRadius: fluentBorderRadius.circular,
    background: `var(--color-accent, ${fluentColors.primary.light})`,
    color: '#ffffff',
    fontSize: fluentTypography.sizes.caption2,
    fontWeight: fluentTypography.weights.semibold,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const pinIconStyle: React.CSSProperties = {
    color: `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
    marginLeft: fluentSpacing.xs,
  };

  const contextMenuStyle: React.CSSProperties = {
    position: 'fixed',
    top: contextMenu?.y || 0,
    left: contextMenu?.x || 0,
    background: `var(--color-bg-secondary, ${fluentColors.neutral.surface})`,
    borderRadius: fluentBorderRadius.large,
    boxShadow: '0 8px 16px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12)',
    border: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
    padding: fluentSpacing.xs,
    minWidth: '160px',
    zIndex: 1000,
  };

  const contextMenuItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: fluentSpacing.m,
    padding: `${fluentSpacing.s} ${fluentSpacing.m}`,
    borderRadius: fluentBorderRadius.medium,
    cursor: 'pointer',
    fontSize: fluentTypography.sizes.body,
    color: `var(--color-text-primary, ${fluentColors.neutral.text})`,
    transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
  };

  const emptyStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: fluentSpacing.xxl,
    color: `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
    textAlign: 'center',
  };

  return (
    <div className={`fluent-conversation-list ${className}`} style={containerStyle} onClick={closeContextMenu}>
      {/* Search */}
      {onSearchChange && (
        <div style={searchContainerStyle}>
          <div style={searchInputStyle}>
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
              placeholder="Search conversations"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: fluentTypography.sizes.body,
                fontFamily: fluentTypography.fontFamily,
                color: `var(--color-text-primary, ${fluentColors.neutral.text})`,
              }}
            />
          </div>
        </div>
      )}

      {/* List */}
      <div style={listStyle} className="fluent-stagger">
        {sortedConversations.length === 0 ? (
          <div style={emptyStyle}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: fluentSpacing.m, opacity: 0.5 }}>
              <path
                d="M8 12a4 4 0 014-4h24a4 4 0 014 4v20a4 4 0 01-4 4H16l-8 8V12z"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <span>{emptyMessage}</span>
          </div>
        ) : (
          sortedConversations.map((conversation) => {
            const isSelected = selectedId === conversation.id;
            const hasUnread = (conversation.unreadCount || 0) > 0;

            return (
              <div
                key={conversation.id}
                className="fluent-conversation-item"
                style={itemStyle(isSelected, hasUnread)}
                onClick={() => onSelect?.(conversation)}
                onContextMenu={(e) => handleContextMenu(e, conversation.id)}
                role="button"
                tabIndex={0}
                aria-selected={isSelected}
              >
                <div style={avatarStyle}>
                  {conversation.avatar ? (
                    <img
                      src={conversation.avatar}
                      alt={conversation.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    getInitials(conversation.title)
                  )}
                  {conversation.online && <div style={onlineIndicatorStyle} />}
                </div>

                <div style={contentStyle}>
                  <div style={headerStyle}>
                    <span style={titleStyle(hasUnread)}>
                      {conversation.title}
                      {conversation.pinned && (
                        <span style={pinIconStyle}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M8.5 1L11 3.5l-2.5 3 .5 4.5L6 8l-3 3-.5-4.5L0 3.5 2.5 1l3 2.5 3-2.5z" />
                          </svg>
                        </span>
                      )}
                    </span>
                    <span style={timestampStyle}>{formatTimestamp(conversation.timestamp)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: fluentSpacing.s }}>
                    <span style={messageStyle(hasUnread)}>{conversation.lastMessage}</span>
                    {hasUnread && <span style={badgeStyle}>{conversation.unreadCount}</span>}
                    {conversation.muted && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                        <path d="M1 1l12 12M7 2.5v4M10.5 7a3.5 3.5 0 01-7 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div style={contextMenuStyle} className="fluent-dialog-enter">
          {onPin && (
            <div
              className="fluent-context-item"
              style={contextMenuItemStyle}
              onClick={() => {
                onPin(contextMenu.id);
                closeContextMenu();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.3 1.3L14.7 4.7l-3.3 4 .6 6L8 10.7l-4 4-.6-6-3.3-4 3.4-3.4 4 3.4 4-3.4z" />
              </svg>
              <span>{conversations.find((c) => c.id === contextMenu.id)?.pinned ? 'Unpin' : 'Pin'}</span>
            </div>
          )}
          {onMute && (
            <div
              className="fluent-context-item"
              style={contextMenuItemStyle}
              onClick={() => {
                onMute(contextMenu.id);
                closeContextMenu();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1 1l14 14M8 3v5M12 8a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>{conversations.find((c) => c.id === contextMenu.id)?.muted ? 'Unmute' : 'Mute'}</span>
            </div>
          )}
          {onDelete && (
            <div
              className="fluent-context-item"
              style={{ ...contextMenuItemStyle, color: fluentColors.semantic.error }}
              onClick={() => {
                onDelete(contextMenu.id);
                closeContextMenu();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4M12.67 4v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Delete</span>
            </div>
          )}
        </div>
      )}

      <style>{`
        .fluent-conversation-item:hover {
          background: var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover}) !important;
        }
        .fluent-conversation-item:focus-visible {
          outline: 2px solid var(--color-accent, ${fluentColors.primary.light});
          outline-offset: -2px;
        }
        .fluent-context-item:hover {
          background: var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover}) !important;
        }
      `}</style>
    </div>
  );
};

export default FluentConversationList;
