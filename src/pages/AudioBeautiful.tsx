/**
 * AudioBeautiful.tsx
 * 
 * Page Audio avec visualisations sonores spectaculaires
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Ear, Mic, MicOff, Volume2, VolumeX, Play,
  Settings, Activity, Waves, Music, Radio, Headphones
} from 'lucide-react';
import { AuroraBackground } from '../components/ui/AnimatedBackground';
import { GlowingCard, GlowingStatCard } from '../components/ui/GlowingCard';

interface AudioClassification {
  label: string;
  confidence: number;
  timestamp: number;
}

export default function AudioBeautiful() {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const [classifications] = useState<AudioClassification[]>([
    { label: 'Voix humaine', confidence: 0.95, timestamp: Date.now() - 2000 },
    { label: 'Musique', confidence: 0.87, timestamp: Date.now() - 5000 },
    { label: 'Bruit ambiant', confidence: 0.72, timestamp: Date.now() - 8000 },
  ]);

  const [stats] = useState({
    sampleRate: 44100,
    channels: 2,
    latency: 12,
    accuracy: 96.5,
  });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create gradient
    const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(0.5, '#8b5cf6');
    gradient.addColorStop(1, '#06b6d4');

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

      // Add glow effect
      ctx.shadowColor = '#8b5cf6';
      ctx.shadowBlur = 10;

      x += barWidth;
    }

    // Calculate average level
    const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    setAudioLevel(avg / 255);

    animationRef.current = requestAnimationFrame(drawVisualizer);
  }, []);

  const toggleListening = async () => {
    if (isListening) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsListening(false);
      setAudioLevel(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        setIsListening(true);
        drawVisualizer();
      } catch (err) {
        console.error('Microphone access denied:', err);
      }
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m`;
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
                <span className="animate-gradient-text">Audio Intelligence</span>
              </h1>
              <p className="text-slate-400">
                Classification audio, reconnaissance vocale et analyse sonore avancée
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleListening}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  isListening
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                {isListening ? 'Arrêter' : 'Écouter'}
              </button>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
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
            label="Sample Rate"
            value={`${stats.sampleRate / 1000}kHz`}
            icon={Radio}
            color="blue"
          />
          <GlowingStatCard
            label="Canaux"
            value={stats.channels}
            icon={Headphones}
            color="purple"
          />
          <GlowingStatCard
            label="Latence"
            value={`${stats.latency}ms`}
            icon={Activity}
            color="cyan"
          />
          <GlowingStatCard
            label="Précision"
            value={`${stats.accuracy}%`}
            icon={Ear}
            color="emerald"
          />
        </div>

        {/* Main Content */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Visualizer */}
          <GlowingCard glowColor="purple" className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Waves className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Visualiseur Audio</h2>
                {isListening && (
                  <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {/* Volume Slider */}
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-slate-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Canvas Visualizer */}
            <div className="relative aspect-[2/1] bg-slate-900/80 rounded-xl overflow-hidden border border-slate-700/30">
              <canvas
                ref={canvasRef}
                width={800}
                height={400}
                className="w-full h-full"
              />
              {!isListening && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <Mic className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Microphone inactif</p>
                  <p className="text-sm">Cliquez sur Écouter pour activer l'analyse</p>
                </div>
              )}
            </div>

            {/* Audio Level Meter */}
            <div className="mt-4 flex items-center gap-4">
              <span className="text-sm text-slate-400">Niveau</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-rose-500 rounded-full transition-all duration-100"
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>
              <span className="text-sm font-mono text-slate-400">
                {Math.round(audioLevel * 100)}%
              </span>
            </div>
          </GlowingCard>

          {/* Classifications */}
          <GlowingCard glowColor="cyan">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Music className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Classifications</h2>
            </div>

            <div className="space-y-3">
              {classifications.map((cls, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-800/40 rounded-xl hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{cls.label}</span>
                    <span className="text-xs text-slate-500">{getTimeAgo(cls.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${cls.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-cyan-400">
                      {Math.round(cls.confidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 space-y-2">
              <button className="w-full flex items-center justify-center gap-2 p-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-xl hover:bg-purple-500/20 transition-colors">
                <Play className="w-4 h-4" />
                Synthèse Vocale
              </button>
              <button className="w-full flex items-center justify-center gap-2 p-3 bg-slate-800/50 border border-slate-700/50 text-slate-400 rounded-xl hover:text-white transition-colors">
                <Radio className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </GlowingCard>
        </div>
      </div>
    </div>
  );
}
