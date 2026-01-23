/**
 * SkeletonLoader - Animation de chargement skeleton
 * Effet de shimmer pour les états de chargement
 */

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export const Skeleton = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  style 
}: SkeletonProps) => (
  <div
    style={{
      width,
      height,
      borderRadius,
      backgroundColor: 'rgba(86, 88, 105, 0.3)',
      backgroundImage: 'linear-gradient(90deg, rgba(86, 88, 105, 0.3) 0%, rgba(86, 88, 105, 0.5) 50%, rgba(86, 88, 105, 0.3) 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
      ...style
    }}
  />
);

export const MessageSkeleton = () => (
  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
    {/* User message skeleton */}
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
        <Skeleton width={200} height={16} />
        <Skeleton width={150} height={16} />
      </div>
    </div>
    
    {/* Assistant message skeleton */}
    <div style={{ display: 'flex', gap: '12px' }}>
      <Skeleton width={40} height={40} borderRadius="50%" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Skeleton width="90%" height={16} />
        <Skeleton width="75%" height={16} />
        <Skeleton width="60%" height={16} />
      </div>
    </div>

    <style>{`
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

export const ConversationSkeleton = () => (
  <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px' }}>
        <Skeleton width={16} height={16} borderRadius={4} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Skeleton width={`${70 + Math.random() * 30}%`} height={14} />
          <Skeleton width={60} height={10} />
        </div>
      </div>
    ))}

    <style>{`
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

export const TypingIndicator = () => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '4px',
    padding: '12px 16px',
  }}>
    {[0, 1, 2].map(i => (
      <div
        key={i}
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: '#10b981',
          animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
        }}
      />
    ))}
    <style>{`
      @keyframes bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-8px); }
      }
    `}</style>
  </div>
);

export default { Skeleton, MessageSkeleton, ConversationSkeleton, TypingIndicator };
