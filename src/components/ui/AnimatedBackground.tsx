/**
 * AnimatedBackground.tsx
 * 
 * Fond animé époustouflant avec particules et dégradés fluides
 */

import React from 'react';

interface AnimatedBackgroundProps {
  variant?: 'aurora' | 'particles' | 'mesh' | 'waves';
  intensity?: 'subtle' | 'medium' | 'vibrant';
  className?: string;
}

/**
 * Fond animé Aurora Borealis
 */
export const AuroraBackground: React.FC<{ intensity?: string }> = ({ intensity = 'medium' }) => {
  const opacityMap = {
    subtle: 'opacity-20',
    medium: 'opacity-40',
    vibrant: 'opacity-60',
  };
  const opacity = opacityMap[intensity as keyof typeof opacityMap] || 'opacity-40';

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      
      {/* Aurora layers */}
      <div className={`absolute inset-0 ${opacity}`}>
        <div 
          className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-blue-500/30 via-cyan-400/20 to-transparent rounded-full blur-3xl animate-aurora-1"
        />
        <div 
          className="absolute top-1/4 right-0 w-2/3 h-1/2 bg-gradient-to-bl from-purple-500/30 via-pink-400/20 to-transparent rounded-full blur-3xl animate-aurora-2"
        />
        <div 
          className="absolute bottom-0 left-1/4 w-1/2 h-1/2 bg-gradient-to-tr from-emerald-500/20 via-teal-400/15 to-transparent rounded-full blur-3xl animate-aurora-3"
        />
      </div>

      {/* Noise texture overlay */}
      <div className="absolute inset-0 bg-noise opacity-[0.02]" />
    </div>
  );
};

/**
 * Fond avec particules flottantes
 */
export const ParticlesBackground: React.FC<{ count?: number }> = ({ count = 50 }) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-gradient-to-r from-blue-400/30 to-purple-400/30 blur-sm"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

/**
 * Fond avec grille mesh animée
 */
export const MeshGradientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950" />
      
      {/* Animated gradient mesh */}
      <div className="absolute inset-0">
        <div className="absolute w-[500px] h-[500px] -top-[250px] -left-[250px] bg-gradient-radial from-blue-600/40 to-transparent rounded-full blur-3xl animate-mesh-1" />
        <div className="absolute w-[400px] h-[400px] top-1/2 -right-[200px] bg-gradient-radial from-purple-600/40 to-transparent rounded-full blur-3xl animate-mesh-2" />
        <div className="absolute w-[600px] h-[600px] -bottom-[300px] left-1/3 bg-gradient-radial from-cyan-600/30 to-transparent rounded-full blur-3xl animate-mesh-3" />
        <div className="absolute w-[300px] h-[300px] top-1/3 left-1/4 bg-gradient-radial from-pink-600/30 to-transparent rounded-full blur-3xl animate-mesh-4" />
      </div>
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
};

/**
 * Fond avec vagues animées
 */
export const WavesBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <svg
        className="absolute bottom-0 w-full h-1/2 opacity-30"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <path
          fill="url(#wave-gradient)"
          fillOpacity="0.3"
          className="animate-wave-1"
          d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,181.3C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
        <path
          fill="url(#wave-gradient)"
          fillOpacity="0.2"
          className="animate-wave-2"
          d="M0,256L48,234.7C96,213,192,171,288,165.3C384,160,480,192,576,208C672,224,768,224,864,208C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>
    </div>
  );
};

/**
 * Composant principal avec sélection de variante
 */
export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  variant = 'aurora',
  intensity = 'medium',
  className = '',
}) => {
  const backgrounds = {
    aurora: <AuroraBackground intensity={intensity} />,
    particles: <ParticlesBackground />,
    mesh: <MeshGradientBackground />,
    waves: <WavesBackground />,
  };

  return (
    <div className={className}>
      {backgrounds[variant]}
    </div>
  );
};

export default AnimatedBackground;
