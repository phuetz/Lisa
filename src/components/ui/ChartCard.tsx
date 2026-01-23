/**
 * ChartCard Component
 * Wrapper pour graphiques avec actions (export, fullscreen, refresh)
 */

import React, { useState, useRef, useCallback } from 'react';
import { Maximize2, Minimize2, Download, RefreshCw, MoreVertical } from 'lucide-react';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onExport?: () => void;
  onRefresh?: () => void;
  onFullscreen?: boolean;
  loading?: boolean;
  error?: string;
  lastUpdated?: Date;
  className?: string;
  actions?: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  onExport,
  onRefresh,
  onFullscreen = true,
  loading = false,
  error,
  lastUpdated,
  className = '',
  actions,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!cardRef.current) return;

    if (!isFullscreen) {
      if (cardRef.current.requestFullscreen) {
        cardRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const handleExport = useCallback(() => {
    if (onExport) {
      onExport();
    } else {
      // Export par défaut: capture du contenu
      const content = cardRef.current?.querySelector('svg');
      if (content) {
        const svgData = new XMLSerializer().serializeToString(content);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}_chart.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
    setShowMenu(false);
  }, [onExport, title]);

  return (
    <div
      ref={cardRef}
      className={`
        bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl
        ${isFullscreen ? 'fixed inset-4 z-50 overflow-auto' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
          {lastUpdated && (
            <p className="text-xs text-slate-500 mt-1">
              Mis à jour: {lastUpdated.toLocaleString('fr-FR')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actions}
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          )}

          {onFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              title={isFullscreen ? 'Réduire' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}

          {/* Menu dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px]">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    <Download size={16} />
                    Exporter SVG
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw size={32} className="animate-spin text-blue-400" />
              <span className="text-slate-400">Chargement...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 font-medium">{error}</p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="mt-3 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
                >
                  Réessayer
                </button>
              )}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default ChartCard;
