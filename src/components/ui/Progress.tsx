import type { CSSProperties } from 'react';

type ProgressColor = 'accent' | 'cyan' | 'green';

interface ProgressProps {
  value: number; // 0-100
  label?: string;
  color?: ProgressColor;
  showPercent?: boolean;
  style?: CSSProperties;
}

const colorVarMap: Record<ProgressColor, string> = {
  accent: 'var(--color-accent)',
  cyan: 'var(--color-cyan)',
  green: 'var(--color-green)',
};

export function Progress({ value, label, color = 'accent', showPercent = true, style }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const barColor = colorVarMap[color];

  return (
    <div style={style}>
      {(label || showPercent) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
            fontSize: '13px',
          }}
        >
          {label && <span style={{ color: 'var(--text-secondary)' }}>{label}</span>}
          {showPercent && (
            <span style={{ color: barColor, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: '6px',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            backgroundColor: barColor,
            borderRadius: '3px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
