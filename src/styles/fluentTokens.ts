/**
 * Fluent Design Tokens
 * Inspired by Microsoft Office 365 / Fluent Design System
 */

export const fluentColors = {
  // Primary palette (Office Blue)
  primary: {
    light: '#0078d4',
    dark: '#2b88d8',
    hover: '#106ebe',
    pressed: '#005a9e',
    subtle: '#eff6fc',
    subtleDark: '#0d3a58',
  },
  // Neutral palette
  neutral: {
    // Light mode
    background: '#faf9f8',
    surface: '#ffffff',
    surfaceHover: '#f3f2f1',
    divider: '#edebe9',
    text: '#323130',
    textSecondary: '#605e5c',
    textDisabled: '#a19f9d',
    // Dark mode
    backgroundDark: '#1b1a19',
    surfaceDark: '#252423',
    surfaceHoverDark: '#323130',
    dividerDark: '#3b3a39',
    textDark: '#ffffff',
    textSecondaryDark: '#d2d0ce',
    textDisabledDark: '#8a8886',
  },
  // Semantic colors
  semantic: {
    success: '#107c10',
    successLight: '#dff6dd',
    successDark: '#0e6b0e',
    warning: '#ffb900',
    warningLight: '#fff4ce',
    warningDark: '#c8a000',
    error: '#d13438',
    errorLight: '#fde7e9',
    errorDark: '#a4262c',
    info: '#0078d4',
    infoLight: '#cce4f6',
    infoDark: '#004578',
  },
};

export const fluentTypography = {
  fontFamily: "'Segoe UI Variable', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
  monoFontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
  sizes: {
    caption2: '10px',
    caption: '12px',
    body2: '13px',
    body: '14px',
    subtitle2: '15px',
    subtitle: '16px',
    title3: '18px',
    title2: '20px',
    title: '24px',
    headline: '28px',
    display: '42px',
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export const fluentSpacing = {
  xxs: '2px',
  xs: '4px',
  s: '8px',
  m: '12px',
  l: '16px',
  xl: '20px',
  xxl: '24px',
  xxxl: '32px',
};

export const fluentBorderRadius = {
  none: '0',
  small: '2px',
  medium: '4px',
  large: '8px',
  xl: '12px',
  circular: '50%',
};

export const fluentElevation = {
  rest: '0 2px 4px rgba(0, 0, 0, 0.04), 0 0 2px rgba(0, 0, 0, 0.08)',
  hover: '0 4px 8px rgba(0, 0, 0, 0.08), 0 0 2px rgba(0, 0, 0, 0.08)',
  pressed: '0 1px 2px rgba(0, 0, 0, 0.12)',
  elevated: '0 6px 12px rgba(0, 0, 0, 0.1), 0 0 2px rgba(0, 0, 0, 0.08)',
  dialog: '0 8px 16px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.12)',
  // Dark mode shadows (more pronounced)
  restDark: '0 2px 4px rgba(0, 0, 0, 0.2), 0 0 2px rgba(0, 0, 0, 0.24)',
  hoverDark: '0 4px 8px rgba(0, 0, 0, 0.28), 0 0 2px rgba(0, 0, 0, 0.24)',
  dialogDark: '0 8px 16px rgba(0, 0, 0, 0.34), 0 0 2px rgba(0, 0, 0, 0.28)',
};

export const fluentMotion = {
  duration: {
    ultraFast: '50ms',
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '400ms',
    gentle: '500ms',
  },
  easing: {
    // Deceleration curve - for entering elements
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    // Acceleration curve - for exiting elements
    accelerate: 'cubic-bezier(1, 0, 1, 1)',
    // Standard curve - for most animations
    standard: 'cubic-bezier(0.33, 0, 0.67, 1)',
    // Linear - for looping animations
    linear: 'linear',
    // Bounce - for playful animations
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};

export const fluentBreakpoints = {
  xs: '320px',
  sm: '480px',
  md: '768px',
  lg: '1024px',
  xl: '1366px',
  xxl: '1920px',
};

// CSS Variable mapping for theme integration
export const fluentCSSVariables = {
  light: {
    '--fluent-bg-primary': fluentColors.neutral.background,
    '--fluent-bg-secondary': fluentColors.neutral.surface,
    '--fluent-bg-hover': fluentColors.neutral.surfaceHover,
    '--fluent-text-primary': fluentColors.neutral.text,
    '--fluent-text-secondary': fluentColors.neutral.textSecondary,
    '--fluent-text-disabled': fluentColors.neutral.textDisabled,
    '--fluent-accent': fluentColors.primary.light,
    '--fluent-accent-hover': fluentColors.primary.hover,
    '--fluent-accent-pressed': fluentColors.primary.pressed,
    '--fluent-accent-subtle': fluentColors.primary.subtle,
    '--fluent-border': fluentColors.neutral.divider,
    '--fluent-shadow-rest': fluentElevation.rest,
    '--fluent-shadow-hover': fluentElevation.hover,
    '--fluent-shadow-dialog': fluentElevation.dialog,
    '--fluent-font-family': fluentTypography.fontFamily,
    '--fluent-success': fluentColors.semantic.success,
    '--fluent-warning': fluentColors.semantic.warning,
    '--fluent-error': fluentColors.semantic.error,
    '--fluent-info': fluentColors.semantic.info,
  },
  dark: {
    '--fluent-bg-primary': fluentColors.neutral.backgroundDark,
    '--fluent-bg-secondary': fluentColors.neutral.surfaceDark,
    '--fluent-bg-hover': fluentColors.neutral.surfaceHoverDark,
    '--fluent-text-primary': fluentColors.neutral.textDark,
    '--fluent-text-secondary': fluentColors.neutral.textSecondaryDark,
    '--fluent-text-disabled': fluentColors.neutral.textDisabledDark,
    '--fluent-accent': fluentColors.primary.dark,
    '--fluent-accent-hover': fluentColors.primary.light,
    '--fluent-accent-pressed': fluentColors.primary.hover,
    '--fluent-accent-subtle': fluentColors.primary.subtleDark,
    '--fluent-border': fluentColors.neutral.dividerDark,
    '--fluent-shadow-rest': fluentElevation.restDark,
    '--fluent-shadow-hover': fluentElevation.hoverDark,
    '--fluent-shadow-dialog': fluentElevation.dialogDark,
    '--fluent-font-family': fluentTypography.fontFamily,
    '--fluent-success': fluentColors.semantic.success,
    '--fluent-warning': fluentColors.semantic.warning,
    '--fluent-error': fluentColors.semantic.error,
    '--fluent-info': fluentColors.semantic.info,
  },
};

// Utility function to apply CSS variables
export function applyFluentTheme(mode: 'light' | 'dark') {
  const variables = fluentCSSVariables[mode];
  const root = document.documentElement;

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export default {
  colors: fluentColors,
  typography: fluentTypography,
  spacing: fluentSpacing,
  borderRadius: fluentBorderRadius,
  elevation: fluentElevation,
  motion: fluentMotion,
  breakpoints: fluentBreakpoints,
  cssVariables: fluentCSSVariables,
  applyTheme: applyFluentTheme,
};
