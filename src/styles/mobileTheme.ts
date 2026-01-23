/**
 * Mobile Theme - Thème sombre optimisé pour Android
 * Couleurs, espacements et animations pour une UX native
 */

export const mobileTheme = {
  colors: {
    // Backgrounds
    background: '#000000',
    backgroundSecondary: '#0a0a0a',
    backgroundTertiary: '#171717',
    surface: '#1a1a1a',
    surfaceElevated: '#242424',
    
    // Primary colors
    primary: '#10a37f',
    primaryHover: '#0d8a6a',
    primaryLight: 'rgba(16, 163, 127, 0.15)',
    
    // Accent colors
    accent: '#5436DA',
    accentLight: 'rgba(84, 54, 218, 0.15)',
    
    // Text colors
    textPrimary: '#ececf1',
    textSecondary: '#8e8ea0',
    textTertiary: '#565869',
    textMuted: '#444654',
    
    // Status colors
    success: '#10b981',
    successLight: 'rgba(16, 185, 129, 0.15)',
    error: '#ef4444',
    errorLight: 'rgba(239, 68, 68, 0.15)',
    warning: '#f59e0b',
    warningLight: 'rgba(245, 158, 11, 0.15)',
    info: '#3b82f6',
    infoLight: 'rgba(59, 130, 246, 0.15)',
    
    // Border colors
    border: '#2d2d2d',
    borderLight: 'rgba(86, 88, 105, 0.3)',
    borderFocus: '#10a37f',
    
    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px',
  },
  
  borderRadius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sizes: {
      xs: '11px',
      sm: '13px',
      md: '14px',
      lg: '16px',
      xl: '18px',
      xxl: '24px',
      xxxl: '32px',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.6,
      loose: 1.8,
    },
  },
  
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 30px rgba(0, 0, 0, 0.4)',
    xl: '0 20px 50px rgba(0, 0, 0, 0.5)',
    glow: '0 0 20px rgba(16, 163, 127, 0.3)',
    glowStrong: '0 0 40px rgba(16, 163, 127, 0.5)',
  },
  
  transitions: {
    fast: '0.15s ease',
    normal: '0.2s ease',
    slow: '0.3s ease',
    bounce: '0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    overlay: 40,
    modal: 50,
    popover: 60,
    toast: 70,
  },
  
  // Safe areas for notch devices
  safeArea: {
    top: 'env(safe-area-inset-top)',
    bottom: 'env(safe-area-inset-bottom)',
    left: 'env(safe-area-inset-left)',
    right: 'env(safe-area-inset-right)',
  },
};

// Animation keyframes as CSS string
export const mobileAnimations = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes slideInFromRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideInFromLeft {
    from { transform: translateX(-100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideInFromBottom {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes slideOutToRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  @keyframes scaleIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
  }
  
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  
  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-8px); }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
`;

export type MobileTheme = typeof mobileTheme;
export default mobileTheme;
