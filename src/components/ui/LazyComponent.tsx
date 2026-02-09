/**
 * 🚀 Lazy Component - Chargement différé des composants lourds
 * Avec skeleton loading et gestion d'erreurs
 */

import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  minHeight?: string;
}

// Default loading skeleton
const DefaultSkeleton = ({ minHeight = '200px' }: { minHeight?: string }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight,
      backgroundColor: 'var(--bg-panel, #1a1a26)',
      borderRadius: '12px',
      border: '1px solid var(--border-primary, #2d2d44)',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <Loader2
        size={32}
        color="var(--color-accent, #f5a623)"
        style={{ animation: 'spin 1s linear infinite' }}
      />
      <p style={{
        marginTop: '12px',
        color: 'var(--text-muted, #6a6a82)',
        fontSize: '13px'
      }}>
        Chargement...
      </p>
    </div>
    <style>
      {`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

// Card skeleton for dashboard
export const CardSkeleton = () => (
  <div
    style={{
      padding: '20px',
      backgroundColor: 'var(--bg-surface, #12121a)',
      borderRadius: '12px',
      border: '1px solid var(--border-primary, #2d2d44)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div>
        <div style={{ 
          width: '80px', 
          height: '14px', 
          backgroundColor: '#2d2d44', 
          borderRadius: '4px',
          marginBottom: '12px',
        }} />
        <div style={{ 
          width: '60px', 
          height: '28px', 
          backgroundColor: '#2d2d44', 
          borderRadius: '4px',
        }} />
      </div>
      <div style={{ 
        width: '44px', 
        height: '44px', 
        backgroundColor: '#2d2d44', 
        borderRadius: '10px',
      }} />
    </div>
  </div>
);

// Table skeleton
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div style={{ padding: '20px', backgroundColor: 'var(--bg-surface, #12121a)', borderRadius: '12px' }}>
    <div style={{ 
      display: 'flex', 
      gap: '10px', 
      marginBottom: '16px',
      alignItems: 'center',
    }}>
      <div style={{ width: '20px', height: '20px', backgroundColor: '#2d2d44', borderRadius: '4px' }} />
      <div style={{ width: '120px', height: '16px', backgroundColor: '#2d2d44', borderRadius: '4px' }} />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div 
        key={i}
        style={{ 
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: '16px',
          padding: '14px 0',
          borderBottom: i < rows - 1 ? '1px solid #2d2d44' : 'none',
        }}
      >
        <div style={{ height: '14px', backgroundColor: '#2d2d44', borderRadius: '4px' }} />
        <div style={{ height: '14px', backgroundColor: '#2d2d44', borderRadius: '4px' }} />
        <div style={{ height: '14px', backgroundColor: '#2d2d44', borderRadius: '4px' }} />
        <div style={{ height: '14px', backgroundColor: '#2d2d44', borderRadius: '4px' }} />
      </div>
    ))}
  </div>
);

// Chart skeleton
export const ChartSkeleton = ({ height = '300px' }: { height?: string }) => (
  <div
    style={{
      height,
      backgroundColor: '#1a1a26',
      borderRadius: '12px',
      border: '1px solid #2d2d44',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      padding: '20px',
      gap: '8px',
    }}
  >
    {[60, 80, 45, 90, 70, 55, 85, 40].map((h, i) => (
      <div
        key={i}
        style={{
          width: '100%',
          height: `${h}%`,
          backgroundColor: '#12121a',
          borderRadius: '4px 4px 0 0',
          animation: 'pulse 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`,
        }}
      />
    ))}
    <style>
      {`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}
    </style>
  </div>
);

// Vision/Camera skeleton
export const VisionSkeleton = () => (
  <div
    style={{
      aspectRatio: '16/9',
      backgroundColor: '#1a1a26',
      borderRadius: '12px',
      border: '1px solid #2d2d44',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '12px',
    }}
  >
    <div style={{
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      backgroundColor: '#12121a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: '#2d2d44',
      }} />
    </div>
    <div style={{ 
      width: '150px', 
      height: '14px', 
      backgroundColor: '#12121a', 
      borderRadius: '4px',
    }} />
  </div>
);

// Lazy wrapper component
export function LazyWrapper({ children, fallback, minHeight }: LazyComponentProps) {
  return (
    <Suspense fallback={fallback || <DefaultSkeleton minHeight={minHeight} />}>
      {children}
    </Suspense>
  );
}

// Pre-configured lazy components for heavy modules
export const LazyChartRenderer = lazy(() => import('../chat/ChartRenderer'));
export const LazyVisionPanel = lazy(() => import('../VisionPanel'));
export const LazyWorkflowManagerPanel = lazy(() => 
  import('../WorkflowManagerPanel').then(m => ({ default: m.WorkflowManagerPanel }))
);

export default LazyWrapper;
