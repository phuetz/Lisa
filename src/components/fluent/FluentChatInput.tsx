/**
 * FluentChatInput - Input chat style Outlook/Teams
 * Multiline avec toolbar et bouton envoi animé
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { fluentMotion, fluentBorderRadius, fluentColors, fluentTypography, fluentSpacing, fluentElevation } from '../../styles/fluentTokens';

export interface FluentChatInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSend?: (value: string, attachments?: File[]) => void;
  onAttach?: (files: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  maxLength?: number;
  showToolbar?: boolean;
  showCharCount?: boolean;
  attachments?: File[];
  onRemoveAttachment?: (index: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

const FluentChatInput: React.FC<FluentChatInputProps> = ({
  value: controlledValue,
  onChange,
  onSend,
  onAttach,
  placeholder = 'Type a message...',
  disabled = false,
  loading = false,
  maxLength,
  showToolbar = true,
  showCharCount = false,
  attachments = [],
  onRemoveAttachment,
  className = '',
  style,
}) => {
  const [internalValue, setInternalValue] = useState('');
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (maxLength && newValue.length > maxLength) return;

      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
    },
    [controlledValue, maxLength, onChange]
  );

  const handleSend = useCallback(() => {
    if (!value.trim() && attachments.length === 0) return;
    if (disabled || loading) return;

    onSend?.(value.trim(), attachments);

    if (controlledValue === undefined) {
      setInternalValue('');
    }
  }, [value, attachments, disabled, loading, onSend, controlledValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onAttach?.(files);
      }
      e.target.value = '';
    },
    [onAttach]
  );

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [value]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    background: `var(--color-bg-secondary, ${fluentColors.neutral.surface})`,
    borderRadius: fluentBorderRadius.large,
    border: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
    boxShadow: fluentElevation.rest,
    fontFamily: fluentTypography.fontFamily,
    overflow: 'hidden',
    transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
    ...style,
  };

  const attachmentsStyle: React.CSSProperties = {
    display: attachments.length > 0 ? 'flex' : 'none',
    gap: fluentSpacing.s,
    padding: `${fluentSpacing.s} ${fluentSpacing.m}`,
    borderBottom: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
    flexWrap: 'wrap',
  };

  const attachmentChipStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: fluentSpacing.xs,
    padding: `${fluentSpacing.xs} ${fluentSpacing.s}`,
    background: `var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover})`,
    borderRadius: fluentBorderRadius.medium,
    fontSize: fluentTypography.sizes.caption,
  };

  const inputAreaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-end',
    gap: fluentSpacing.s,
    padding: fluentSpacing.m,
  };

  const textareaStyle: React.CSSProperties = {
    flex: 1,
    minHeight: '24px',
    maxHeight: '150px',
    padding: `${fluentSpacing.s} 0`,
    border: 'none',
    outline: 'none',
    resize: 'none',
    background: 'transparent',
    fontSize: fluentTypography.sizes.body,
    fontFamily: fluentTypography.fontFamily,
    lineHeight: fluentTypography.lineHeights.normal,
    color: `var(--color-text-primary, ${fluentColors.neutral.text})`,
  };

  const toolbarStyle: React.CSSProperties = {
    display: showToolbar ? 'flex' : 'none',
    alignItems: 'center',
    gap: fluentSpacing.xs,
    padding: `${fluentSpacing.s} ${fluentSpacing.m}`,
    borderTop: `1px solid var(--color-border, ${fluentColors.neutral.divider})`,
  };

  const toolbarButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: fluentBorderRadius.medium,
    background: 'transparent',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
    transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
    opacity: disabled ? 0.5 : 1,
  };

  const sendButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: fluentBorderRadius.circular,
    background:
      value.trim() || attachments.length > 0
        ? `var(--color-accent, ${fluentColors.primary.light})`
        : `var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover})`,
    border: 'none',
    cursor: disabled || loading || (!value.trim() && attachments.length === 0) ? 'not-allowed' : 'pointer',
    color: value.trim() || attachments.length > 0 ? '#ffffff' : `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
    transition: `all ${fluentMotion.duration.normal} ${fluentMotion.easing.standard}`,
    transform: 'scale(1)',
    flexShrink: 0,
  };

  const charCountStyle: React.CSSProperties = {
    marginLeft: 'auto',
    fontSize: fluentTypography.sizes.caption,
    color:
      maxLength && value.length > maxLength * 0.9
        ? fluentColors.semantic.warning
        : `var(--color-text-secondary, ${fluentColors.neutral.textSecondary})`,
  };

  const getFileIcon = (file: File) => {
    const type = file.type.split('/')[0];
    switch (type) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎬';
      case 'audio':
        return '🎵';
      default:
        return '📄';
    }
  };

  return (
    <div className={`fluent-chat-input ${className}`} style={containerStyle}>
      {/* Attachments preview */}
      <div style={attachmentsStyle}>
        {attachments.map((file, index) => (
          <div key={index} style={attachmentChipStyle}>
            <span>{getFileIcon(file)}</span>
            <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </span>
            {onRemoveAttachment && (
              <button
                onClick={() => onRemoveAttachment(index)}
                style={{
                  ...toolbarButtonStyle,
                  width: '16px',
                  height: '16px',
                  padding: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Input area */}
      <div style={inputAreaStyle}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          style={textareaStyle}
          rows={1}
          aria-label="Message input"
        />

        <button
          onClick={handleSend}
          disabled={disabled || loading || (!value.trim() && attachments.length === 0)}
          style={sendButtonStyle}
          className="fluent-send-button"
          aria-label="Send message"
        >
          {loading ? (
            <span
              className="fluent-spinner"
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid currentColor',
                borderTopColor: 'transparent',
                borderRadius: '50%',
              }}
            />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M16.5 1.5L8.25 9.75M16.5 1.5L11.25 16.5L8.25 9.75M16.5 1.5L1.5 6.75L8.25 9.75"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Toolbar */}
      <div style={toolbarStyle}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />

        <button
          style={toolbarButtonStyle}
          className="fluent-toolbar-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Attach file"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M15.75 8.25l-6.879 6.879a3.75 3.75 0 01-5.303-5.303l6.879-6.879a2.5 2.5 0 013.535 3.536l-6.879 6.878a1.25 1.25 0 01-1.768-1.768l6.38-6.378"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button style={toolbarButtonStyle} className="fluent-toolbar-button" disabled={disabled} title="Add emoji">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 10.5s1.125 1.5 3 1.5 3-1.5 3-1.5M6.75 6.75h.008M11.25 6.75h.008" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <button style={toolbarButtonStyle} className="fluent-toolbar-button" disabled={disabled} title="Voice message">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1.5v10.5M9 12a3 3 0 003-3V5.25a3 3 0 00-6 0V9a3 3 0 003 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14.25 9a5.25 5.25 0 01-10.5 0M9 14.25v2.25M6.75 16.5h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {showCharCount && maxLength && (
          <span style={charCountStyle}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      <style>{`
        .fluent-chat-input:focus-within {
          border-color: var(--color-accent, ${fluentColors.primary.light}) !important;
          box-shadow: 0 0 0 1px var(--color-accent, ${fluentColors.primary.light}), ${fluentElevation.rest};
        }
        .fluent-toolbar-button:hover:not(:disabled) {
          background: var(--color-bg-tertiary, ${fluentColors.neutral.surfaceHover}) !important;
          color: var(--color-accent, ${fluentColors.primary.light}) !important;
        }
        .fluent-send-button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: ${fluentElevation.hover};
        }
        .fluent-send-button:active:not(:disabled) {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
};

export default FluentChatInput;
