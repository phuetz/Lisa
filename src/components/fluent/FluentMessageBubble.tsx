/**
 * FluentMessageBubble - Message style Microsoft Teams
 * Bulles avec avatar, timestamp, et actions hover
 */

import React, { useState } from 'react';
import { fluentMotion, fluentBorderRadius, fluentColors, fluentTypography, fluentSpacing, fluentElevation } from '../../styles/fluentTokens';

export interface FluentMessageBubbleProps {
  id: string;
  content: string | React.ReactNode;
  sender: {
    name: string;
    avatar?: string;
    isUser?: boolean;
  };
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  reactions?: { emoji: string; count: number; reacted?: boolean }[];
  onCopy?: () => void;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onRetry?: () => void;
  isStreaming?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const FluentMessageBubble: React.FC<FluentMessageBubbleProps> = ({
  id,
  content,
  sender,
  timestamp,
  status,
  reactions,
  onCopy,
  onReply,
  onReact,
  onRetry,
  isStreaming = false,
  className = '',
  style,
}) => {
  const [showActions, setShowActions] = useState(false);
  const isUser = sender.isUser;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isUser ? 'row-reverse' : 'row',
    gap: fluentSpacing.m,
    padding: `${fluentSpacing.s} ${fluentSpacing.l}`,
    fontFamily: fluentTypography.fontFamily,
    ...style,
  };

  const avatarStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: fluentBorderRadius.circular,
    background: isUser
      ? `var(--color-accent, ${fluentColors.primary.light})`
      : `var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: fluentTypography.sizes.caption,
    fontWeight: fluentTypography.weights.semibold,
    color: isUser ? '#ffffff' : `var(--color-text-primary, ${fluentColors.neutral.text})`,
    flexShrink: 0,
    overflow: 'hidden',
  };

  const bubbleContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: isUser ? 'flex-end' : 'flex-start',
    maxWidth: '70%',
    position: 'relative',
  };

  const senderStyle: React.CSSProperties = {
    fontSize: fluentTypography.sizes.caption,
    fontWeight: fluentTypography.weights.semibold,
    color: `var(--color-text-primary, ${fluentColors.neutral.text})`,
    marginBottom: fluentSpacing.xs,
    display: isUser ? 'none' : 'block',
  };

  const bubbleStyle: React.CSSProperties = {
    padding: `${fluentSpacing.m} ${fluentSpacing.l}`,
    borderRadius: isUser
      ? `${fluentBorderRadius.large} ${fluentBorderRadius.large} ${fluentBorderRadius.small} ${fluentBorderRadius.large}`
      : `${fluentBorderRadius.large} ${fluentBorderRadius.large} ${fluentBorderRadius.large} ${fluentBorderRadius.small}`,
    background: isUser
      ? `var(--color-accent, ${fluentColors.primary.light})`
      : `var(--color-bg-secondary, ${fluentColors.neutral.surface})`,
    color: isUser ? '#ffffff' : `var(--color-text-primary, ${fluentColors.neutral.text})`,
    boxShadow: isUser ? 'none' : fluentElevation.rest,
    border: isUser ? 'none' : `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
    fontSize: fluentTypography.sizes.body,
    lineHeight: fluentTypography.lineHeights.relaxed,
    wordBreak: 'break-word',
    position: 'relative',
  };

  const metaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: fluentSpacing.s,
    marginTop: fluentSpacing.xs,
    fontSize: fluentTypography.sizes.caption,
    color: `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
  };

  const actionsStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-8px',
    right: isUser ? 'auto' : '-8px',
    left: isUser ? '-8px' : 'auto',
    display: showActions ? 'flex' : 'none',
    gap: fluentSpacing.xs,
    background: `var(--color-bg-secondary, ${fluentColors.neutral.surface})`,
    borderRadius: fluentBorderRadius.medium,
    boxShadow: fluentElevation.elevated,
    border: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
    padding: fluentSpacing.xs,
    zIndex: 10,
  };

  const actionButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: fluentBorderRadius.medium,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
    transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
  };

  const reactionStyle = (reacted?: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: fluentSpacing.xs,
    padding: `${fluentSpacing.xs} ${fluentSpacing.s}`,
    borderRadius: fluentBorderRadius.circular,
    background: reacted
      ? `var(--color-accent-muted, ${fluentColors.primary.subtle})`
      : `var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover})`,
    border: reacted
      ? `1px solid var(--color-accent, ${fluentColors.primary.light})`
      : '1px solid transparent',
    fontSize: fluentTypography.sizes.caption,
    cursor: 'pointer',
    transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return (
          <span className="fluent-spinner" style={{ width: '12px', height: '12px', border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
        );
      case 'sent':
        return (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'delivered':
        return (
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path d="M1 6l3 3 5-6M6 6l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'read':
        return (
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path d="M1 6l3 3 5-6M6 6l3 3 5-6" stroke={fluentColors.primary.light} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'error':
        return (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" onClick={onRetry} style={{ cursor: 'pointer' }}>
            <circle cx="6" cy="6" r="5" stroke={fluentColors.semantic.error} strokeWidth="1.5" fill="none" />
            <path d="M6 3v4M6 8.5v.5" stroke={fluentColors.semantic.error} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`fluent-message-bubble fluent-message-enter ${className}`}
      style={containerStyle}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div style={avatarStyle}>
        {sender.avatar ? (
          <img src={sender.avatar} alt={sender.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          getInitials(sender.name)
        )}
      </div>

      <div style={bubbleContainerStyle}>
        <span style={senderStyle}>{sender.name}</span>

        <div style={{ position: 'relative' }}>
          <div style={bubbleStyle}>
            {typeof content === 'string' ? <p style={{ margin: 0 }}>{content}</p> : content}
            {isStreaming && (
              <span className="fluent-typing-indicator" style={{ display: 'inline-flex', gap: '2px', marginLeft: '4px' }}>
                <span className="fluent-typing-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor' }} />
                <span className="fluent-typing-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor' }} />
                <span className="fluent-typing-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor' }} />
              </span>
            )}
          </div>

          <div style={actionsStyle} className="fluent-message-actions">
            {onReact && (
              <button
                style={actionButtonStyle}
                className="fluent-action-button"
                onClick={() => onReact('thumbsup')}
                title="React"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 14c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5.5 9.5s1 1.5 2.5 1.5 2.5-1.5 2.5-1.5M6 6.5h.01M10 6.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
            {onReply && (
              <button
                style={actionButtonStyle}
                className="fluent-action-button"
                onClick={onReply}
                title="Reply"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 5L2 8.5L6 12M2 8.5h8c2 0 4 1 4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {onCopy && (
              <button
                style={actionButtonStyle}
                className="fluent-action-button"
                onClick={onCopy}
                title="Copy"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="5" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 11V4a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div style={metaStyle}>
          <span>{formatTime(timestamp)}</span>
          {isUser && status && getStatusIcon()}
        </div>

        {reactions && reactions.length > 0 && (
          <div style={{ display: 'flex', gap: fluentSpacing.xs, marginTop: fluentSpacing.xs, flexWrap: 'wrap' }}>
            {reactions.map((reaction, index) => (
              <span
                key={index}
                style={reactionStyle(reaction.reacted)}
                onClick={() => onReact?.(reaction.emoji)}
                className="fluent-reaction"
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .fluent-action-button:hover {
          background: var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover}) !important;
          color: var(--color-accent, ${fluentColors.primary.light}) !important;
        }
        .fluent-reaction:hover {
          background: var(--color-accent-muted, ${fluentColors.primary.subtle}) !important;
        }
      `}</style>
    </div>
  );
};

export default FluentMessageBubble;
