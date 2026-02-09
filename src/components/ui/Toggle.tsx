import type { CSSProperties } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: CSSProperties;
}

export function Toggle({ checked, onChange, label, description, disabled = false, style }: ToggleProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {(label || description) && (
        <div style={{ flex: 1, minWidth: 0 }}>
          {label && (
            <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
              {label}
            </div>
          )}
          {description && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {description}
            </div>
          )}
        </div>
      )}
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          position: 'relative',
          width: '44px',
          height: '24px',
          borderRadius: '12px',
          border: checked ? '1px solid var(--color-accent)' : '1px solid var(--border-primary)',
          backgroundColor: checked ? 'var(--color-accent)' : 'var(--bg-panel)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
          padding: 0,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '22px' : '2px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            backgroundColor: checked ? '#0a0a0f' : 'var(--text-muted)',
            transition: 'left var(--transition-fast), background-color var(--transition-fast)',
          }}
        />
      </button>
    </label>
  );
}
