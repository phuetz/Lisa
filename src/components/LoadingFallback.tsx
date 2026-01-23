/**
 * Loading Fallback Component
 * 
 * Composant de chargement réutilisable pour lazy loading
 */

import React from 'react';

interface LoadingFallbackProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({ 
  message = 'Chargement...', 
  fullScreen = true 
}) => {
  const containerClasses = fullScreen
    ? 'flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          {/* Spinner outer ring */}
          <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
          {/* Spinner spinning ring */}
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          {/* Inner glow */}
          <div className="absolute inset-2 bg-blue-500/10 rounded-full blur-sm"></div>
        </div>
        <p className="text-slate-300 text-lg font-medium">{message}</p>
        <p className="text-slate-500 text-sm mt-2">Veuillez patienter...</p>
      </div>
    </div>
  );
};

export default LoadingFallback;
