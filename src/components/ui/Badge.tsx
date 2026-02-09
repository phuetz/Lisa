import type { ReactNode, CSSProperties } from 'react';

type BadgeColor = 'accent' | 'cyan' | 'green' | 'red' | 'muted';

interface BadgeProps {
  color?: BadgeColor;
  children: ReactNode;
  style?: CSSProperties;
}

const colorMap: Record<BadgeColor, { bg: string; text: string; border: string }> = {
  accent: {
    bg: 'rgba(245, 166, 35, 0.15)',
    text: 'var(--color-accent)',
    border: 'rgba(245, 166, 35, 0.30)',
  },
  cyan: {
    bg: 'rgba(6, 182, 212, 0.15)',
    text: 'var(--color-cyan)',
    border: 'rgba(6, 182, 212, 0.30)',
  },
  green: {
    bg: 'rgba(34, 197, 94, 0.15)',
    text: 'var(--color-green)',
    border: 'rgba(34, 197, 94, 0.30)',
  },
  red: {
    bg: 'rgba(239, 68, 68, 0.15)',
    text: 'var(--color-error)',
    border: 'rgba(239, 68, 68, 0.30)',
  },
  muted: {
    bg: 'rgba(106, 106, 130, 0.15)',
    text: 'var(--text-muted)',
    border: 'rgba(106, 106, 130, 0.30)',
  },
};

export function Badge({ color = 'muted', children, style }: BadgeProps) {
  const c = colorMap[color];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        fontSize: '12px',
        fontWeight: 500,
        borderRadius: 'var(--radius-pill)',
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
