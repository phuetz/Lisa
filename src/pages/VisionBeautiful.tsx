/**
 * VisionBeautiful.tsx
 * 
 * Page Vision avec design spectaculaire et visualisations avancées
 */

import { useState, useEffect, useRef } from 'react';
import {
  Eye, Camera, Scan, Image, Maximize2, Minimize2,
  Play, Pause, Settings, Download, RefreshCw,
  ZoomIn, ZoomOut, Grid, Layers, Target, Activity
} from 'lucide-react';
import { AuroraBackground } from '../components/ui/AnimatedBackground';
import { GlowingCard, GlowingStatCard } from '../components/ui/GlowingCard';

interface Detection {
  id: string;
  label: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  color: string;
}

interface VisionStats {
  fps: number;
  detections: number;
  latency: number;
  accuracy: number;
}

export default function VisionBeautiful() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'ocr'>('camera');
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [stats] = useState<VisionStats>({
    fps: 30,
    detections: 12,
    latency: 45,
    accuracy: 97.8,
  });

  const [detections] = useState<Detection[]>([
    { id: '1', label: 'Person', confidence: 0.98, bbox: { x: 120, y: 80, width: 150, height: 280 }, color: '#3b82f6' },
    { id: '2', label: 'Laptop', confidence: 0.95, bbox: { x: 300, y: 200, width: 180, height: 120 }, color: '#8b5cf6' },
    { id: '3', label: 'Cup', confidence: 0.87, bbox: { x: 450, y: 250, width: 60, height: 80 }, color: '#06b6d4' },
  ]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const toggleStream = async () => {
    if (isStreaming) {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsStreaming(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsStreaming(true);
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    }
  };

  return (
    <div className="min-h-screen relative">
      <AuroraBackground intensity="subtle" />

      <div className="relative z-10 p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className={`mb-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                <span className="animate-gradient-text">Vision Intelligence</span>
              </h1>
              <p className="text-slate-400">
                Détection d'objets, reconnaissance faciale et analyse de scènes en temps réel
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleStream}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  isStreaming
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                }`}
              >
                {isStreaming ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isStreaming ? 'Arrêter' : 'Démarrer'}
              </button>
              <button className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <GlowingStatCard
            label="FPS"
            value={stats.fps}
            icon={Activity}
            color="blue"
          />
          <GlowingStatCard
            label="Détections"
            value={stats.detections}
            icon={Target}
            color="purple"
          />
          <GlowingStatCard
            label="Latence"
            value={`${stats.latency}ms`}
            icon={RefreshCw}
            color="cyan"
          />
          <GlowingStatCard
            label="Précision"
            value={`${stats.accuracy}%`}
            icon={Eye}
            color="emerald"
          />
        </div>

        {/* Tabs */}
        <div className={`flex gap-2 mb-6 transition-all duration-700 delay-150 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {[
            { id: 'camera', label: 'Caméra', icon: Camera },
            { id: 'upload', label: 'Upload', icon: Image },
            { id: 'ocr', label: 'OCR', icon: Scan },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'camera' | 'upload' | 'ocr')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Video Feed */}
          <GlowingCard glowColor="blue" className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Camera className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Flux Vidéo</h2>
                {isStreaming && (
                  <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white transition-colors">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white transition-colors">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white transition-colors">
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white transition-colors"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Video Container */}
            <div className="relative aspect-video bg-slate-900/80 rounded-xl overflow-hidden border border-slate-700/30">
              {isStreaming ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Detection Overlays */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {detections.map(det => (
                      <g key={det.id}>
                        <rect
                          x={det.bbox.x}
                          y={det.bbox.y}
                          width={det.bbox.width}
                          height={det.bbox.height}
                          fill="none"
                          stroke={det.color}
                          strokeWidth="2"
                          rx="4"
                          className="animate-pulse"
                        />
                        <rect
                          x={det.bbox.x}
                          y={det.bbox.y - 24}
                          width={det.label.length * 10 + 40}
                          height="22"
                          fill={det.color}
                          rx="4"
                        />
                        <text
                          x={det.bbox.x + 6}
                          y={det.bbox.y - 8}
                          fill="white"
                          fontSize="12"
                          fontWeight="600"
                        >
                          {det.label} {Math.round(det.confidence * 100)}%
                        </text>
                      </g>
                    ))}
                  </svg>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <Camera className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Caméra inactive</p>
                  <p className="text-sm">Cliquez sur Démarrer pour activer le flux</p>
                </div>
              )}
            </div>
          </GlowingCard>

          {/* Detections Panel */}
          <GlowingCard glowColor="purple">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Détections</h2>
            </div>

            <div className="space-y-3">
              {detections.length > 0 ? (
                detections.map(det => (
                  <div
                    key={det.id}
                    className="p-4 bg-slate-800/40 rounded-xl hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: det.color }}
                        />
                        <span className="font-medium text-white">{det.label}</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: det.color }}>
                        {Math.round(det.confidence * 100)}%
                      </span>
                    </div>
                    {/* Confidence Bar */}
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${det.confidence * 100}%`,
                          backgroundColor: det.color,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                      <span>Position: {det.bbox.x}, {det.bbox.y}</span>
                      <span>Taille: {det.bbox.width}x{det.bbox.height}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune détection</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 pt-4 border-t border-slate-700/50 flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800/50 rounded-xl text-slate-400 hover:text-white transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800/50 rounded-xl text-slate-400 hover:text-white transition-colors">
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </GlowingCard>
        </div>
      </div>
    </div>
  );
}
