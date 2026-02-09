/**
 * AudioReader Studio Theme - Color Constants
 * Dark professional audio studio aesthetic with amber/cyan accents
 */

export const colors = {
  // Backgrounds
  deep: '#0a0a0f',
  surface: '#12121a',
  panel: '#1a1a26',

  // Borders
  border: '#2d2d44',

  // Accent - Warm Amber/Gold (like vintage VU meters)
  accent: '#f5a623',
  accentHover: '#e6951a',
  accentSubtle: 'rgba(245, 166, 35, 0.10)',

  // Secondary accent - Cyan/Teal
  cyan: '#06b6d4',
  cyanDim: '#0891b2',
  cyanSubtle: 'rgba(6, 182, 212, 0.10)',

  // Status
  green: '#22c55e',
  greenSubtle: 'rgba(34, 197, 94, 0.15)',
  red: '#ef4444',
  redSubtle: 'rgba(239, 68, 68, 0.15)',

  // Text
  primary: '#e8e8f0',
  secondary: '#9898b0',
  muted: '#6a6a82',

  // Light theme overrides
  light: {
    deep: '#f5f5f7',
    surface: '#ffffff',
    panel: '#f0f0f4',
    border: '#d4d4dc',
    accent: '#e08a00',
    primary: '#1a1a2e',
    secondary: '#5a5a70',
    muted: '#8a8a9e',
  },
} as const;
