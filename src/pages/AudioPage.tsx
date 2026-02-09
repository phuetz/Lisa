import { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Play, Square,
  MessageSquare, Trash2, Copy, Check, ChevronDown,
  AlertCircle, Settings, Waves, Radio, Headphones
} from 'lucide-react';
import { useVoiceChat } from '../hooks/useVoiceChat';

// Transcript Entry Interface
interface TranscriptEntry {
  id: number;
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

// Circular Audio Visualizer Component
const CircularVisualizer = ({ isActive }: { isActive: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const barsRef = useRef<number[]>(Array(64).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;
    const barCount = 64;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update bar heights
      barsRef.current = barsRef.current.map((h, i) => {
        if (isActive) {
          const target = Math.random() * 40 + 10;
          return h + (target - h) * 0.3;
        } else {
          return h * 0.9;
        }
      });

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        const barHeight = barsRef.current[i];

        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        if (isActive) {
          gradient.addColorStop(0, '#10b981');
          gradient.addColorStop(1, '#34d399');
        } else {
          gradient.addColorStop(0, '#475569');
          gradient.addColorStop(1, '#64748b');
        }

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Draw center circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 10, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(71, 85, 105, 0.1)';
      ctx.fill();
      ctx.strokeStyle = isActive ? '#10b981' : '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw mic icon in center
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isActive ? '#10b981' : '#64748b';
      ctx.fillText(isActive ? '🎤' : '🎙️', centerX, centerY);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={250}
      height={250}
      style={{ margin: '0 auto', display: 'block' }}
    />
  );
};

// Wave Visualizer for TTS
const WaveVisualizer = ({ isActive }: { isActive: boolean }) => {
  const [waves, setWaves] = useState<number[]>(Array(40).fill(0));

  useEffect(() => {
    if (!isActive) {
      setWaves(Array(40).fill(0));
      return;
    }

    const interval = setInterval(() => {
      setWaves(prev => prev.map((_, i) => {
        const phase = Date.now() / 200 + i * 0.3;
        return Math.sin(phase) * 15 + 20;
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2px',
      height: '60px',
      padding: '0 20px'
    }}>
      {waves.map((height, i) => (
        <div
          key={i}
          style={{
            width: '4px',
            height: `${height}px`,
            borderRadius: '2px',
            background: isActive
              ? `linear-gradient(to top, var(--color-purple, #8b5cf6), #a78bfa)`
              : 'var(--text-muted, #6a6a82)',
            transition: 'height 0.05s ease'
          }}
        />
      ))}
    </div>
  );
};

export default function AudioPage() {
  // Voice Chat Hook
  const {
    isListening,
    transcript,
    interimTranscript,
    toggleListening,
    isSpeaking,
    speak,
    stopSpeaking,
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate,
    speechPitch,
    setSpeechPitch,
    isSupported,
    error: voiceError,
  } = useVoiceChat({ language: 'fr-FR' });

  // Local State
  const [textToSpeak, setTextToSpeak] = useState('');
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcription' | 'synthesis'>('transcription');
  const [showSettings, setShowSettings] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const idCounterRef = useRef(0);

  // French voices
  const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));
  const displayVoices = frenchVoices.length > 0 ? frenchVoices : voices.slice(0, 10);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptHistory, interimTranscript]);

  // Add final transcript to history
  useEffect(() => {
    if (transcript) {
      idCounterRef.current += 1;
      setTranscriptHistory(prev => [...prev, {
        id: idCounterRef.current,
        text: transcript,
        timestamp: new Date(),
        isFinal: true,
      }]);
    }
  }, [transcript]);

  // Copy transcript to clipboard
  const copyTranscript = () => {
    const text = transcriptHistory.map(t => t.text).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear transcript
  const clearTranscript = () => {
    setTranscriptHistory([]);
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Speak text
  const handleSpeak = () => {
    if (textToSpeak.trim()) {
      speak(textToSpeak);
    }
  };

  // Sample texts for TTS
  const sampleTexts = [
    "Bonjour, je suis Lisa, votre assistante virtuelle.",
    "Comment puis-je vous aider aujourd'hui ?",
    "La météo est ensoleillée avec 22 degrés.",
    "Vous avez 3 nouveaux messages.",
  ];

  if (!isSupported) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Audio</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Reconnaissance vocale et synthèse vocale</p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px'
        }}>
          <div style={{
            textAlign: 'center',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '24px',
            padding: '48px',
            maxWidth: '400px'
          }}>
            <MicOff size={64} color="#f87171" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-error, #ef4444)', marginBottom: '8px' }}>
              Non supporté
            </h2>
            <p style={{ color: 'rgba(254, 202, 202, 0.7)', fontSize: '14px' }}>
              La reconnaissance vocale n'est pas supportée par ce navigateur.
              Utilisez Chrome ou Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Audio</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Reconnaissance vocale et synthèse vocale</p>
      </div>
      {/* Header with tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          background: 'var(--bg-surface, #12121a)',
          padding: '4px',
          borderRadius: '12px'
        }}>
          <button
            onClick={() => setActiveTab('transcription')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500,
              background: activeTab === 'transcription' ? 'var(--color-accent, #f5a623)' : 'transparent',
              color: activeTab === 'transcription' ? 'var(--text-primary, #e8e8f0)' : 'var(--text-muted, #6a6a82)',
              transition: 'all 0.2s'
            }}
          >
            <Mic size={18} />
            Transcription
          </button>
          <button
            onClick={() => setActiveTab('synthesis')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500,
              background: activeTab === 'synthesis' ? 'var(--color-purple, #8b5cf6)' : 'transparent',
              color: activeTab === 'synthesis' ? 'var(--text-primary, #e8e8f0)' : 'var(--text-muted, #6a6a82)',
              transition: 'all 0.2s'
            }}
          >
            <Volume2 size={18} />
            Synthèse
          </button>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--border-primary, #2d2d44)',
            background: showSettings ? 'var(--border-primary, #2d2d44)' : 'transparent',
            color: 'var(--text-muted, #6a6a82)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div style={{
          background: 'var(--bg-surface, #12121a)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid var(--border-primary, #2d2d44)'
        }}>
          <h3 style={{ color: 'var(--text-primary, #e8e8f0)', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            Paramètres vocaux
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted, #6a6a82)', marginBottom: '8px' }}>
                Voix
              </label>
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const voice = voices.find(v => v.name === e.target.value);
                  if (voice) setSelectedVoice(voice);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-deep, #0a0a0f)',
                  border: '1px solid var(--border-primary, #2d2d44)',
                  borderRadius: '8px',
                  color: 'var(--text-primary, #e8e8f0)',
                  fontSize: '14px'
                }}
              >
                {displayVoices.map(voice => (
                  <option key={voice.name} value={voice.name}>{voice.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-muted, #6a6a82)' }}>Vitesse</label>
                <span style={{ fontSize: '13px', color: 'var(--text-primary, #e8e8f0)' }}>{speechRate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-purple, #8b5cf6)' }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-muted, #6a6a82)' }}>Tonalité</label>
                <span style={{ fontSize: '13px', color: 'var(--text-primary, #e8e8f0)' }}>{speechPitch.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-purple, #8b5cf6)' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* ========== TRANSCRIPTION PANEL ========== */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(30, 41, 59, 0.8) 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          overflow: 'hidden',
          opacity: activeTab === 'transcription' ? 1 : 0.5,
          transition: 'opacity 0.3s'
        }}>
          {/* Visualizer */}
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(16, 185, 129, 0.1)' }}>
            <CircularVisualizer isActive={isListening} />
          </div>

          {/* Controls */}
          <div style={{ padding: '24px' }}>
            <button
              onClick={toggleListening}
              disabled={activeTab !== 'transcription'}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: 'none',
                cursor: activeTab === 'transcription' ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                fontSize: '16px',
                fontWeight: 600,
                background: isListening
                  ? 'linear-gradient(135deg, var(--color-error, #ef4444), #dc2626)'
                  : 'linear-gradient(135deg, var(--color-accent, #f5a623), var(--color-accent-hover, #e6951a))',
                color: 'var(--text-primary, #e8e8f0)',
                boxShadow: isListening
                  ? '0 8px 32px rgba(239, 68, 68, 0.3)'
                  : '0 8px 32px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.3s'
              }}
            >
              {isListening ? (
                <>
                  <MicOff size={24} />
                  Arrêter l'écoute
                </>
              ) : (
                <>
                  <Mic size={24} />
                  Commencer l'écoute
                </>
              )}
            </button>

            {/* Status */}
            {isListening && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'var(--color-accent, #f5a623)',
                  animation: 'pulse 1.5s infinite'
                }} />
                <span style={{ color: 'var(--color-accent, #f5a623)', fontSize: '14px' }}>
                  Écoute en cours - Parlez maintenant
                </span>
              </div>
            )}

            {voiceError && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <AlertCircle size={18} color="#f87171" />
                <span style={{ color: 'var(--color-error, #ef4444)', fontSize: '14px' }}>{voiceError}</span>
              </div>
            )}
          </div>

          {/* Transcript */}
          <div style={{
            padding: '0 24px 24px',
            maxHeight: '250px',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <span style={{ color: 'var(--text-muted, #6a6a82)', fontSize: '13px' }}>
                {transcriptHistory.length} phrase{transcriptHistory.length !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={copyTranscript}
                  disabled={transcriptHistory.length === 0}
                  style={{
                    padding: '6px',
                    background: 'transparent',
                    border: 'none',
                    color: copied ? 'var(--color-accent, #f5a623)' : 'var(--text-muted, #6a6a82)',
                    cursor: transcriptHistory.length > 0 ? 'pointer' : 'not-allowed',
                    opacity: transcriptHistory.length > 0 ? 1 : 0.5
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button
                  onClick={clearTranscript}
                  disabled={transcriptHistory.length === 0}
                  style={{
                    padding: '6px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted, #6a6a82)',
                    cursor: transcriptHistory.length > 0 ? 'pointer' : 'not-allowed',
                    opacity: transcriptHistory.length > 0 ? 1 : 0.5
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-deep, #0a0a0f)',
              borderRadius: '12px',
              padding: '16px',
              minHeight: '150px'
            }}>
              {transcriptHistory.length === 0 && !interimTranscript ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '120px',
                  color: 'var(--text-muted, #6a6a82)'
                }}>
                  <MessageSquare size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <span style={{ fontSize: '13px' }}>La transcription apparaîtra ici</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {transcriptHistory.map((entry) => (
                    <div key={entry.id} style={{ display: 'flex', gap: '12px' }}>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--text-muted, #6a6a82)',
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                        paddingTop: '2px'
                      }}>
                        {formatTime(entry.timestamp)}
                      </span>
                      <p style={{ color: 'var(--text-primary, #e8e8f0)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                        {entry.text}
                      </p>
                    </div>
                  ))}
                  {interimTranscript && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--color-info, #3b82f6)',
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                        paddingTop: '2px'
                      }}>
                        ...
                      </span>
                      <p style={{
                        color: 'rgba(96, 165, 250, 0.7)',
                        fontSize: '14px',
                        margin: 0,
                        fontStyle: 'italic',
                        lineHeight: 1.5
                      }}>
                        {interimTranscript}
                      </p>
                    </div>
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========== SYNTHESIS PANEL ========== */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(30, 41, 59, 0.8) 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          overflow: 'hidden',
          opacity: activeTab === 'synthesis' ? 1 : 0.5,
          transition: 'opacity 0.3s'
        }}>
          {/* Visualizer */}
          <div style={{
            padding: '40px 24px',
            borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: isSpeaking
                ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(167, 139, 250, 0.1))'
                : 'rgba(71, 85, 105, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `3px solid ${isSpeaking ? 'var(--color-purple, #8b5cf6)' : 'var(--text-muted, #6a6a82)'}`,
              transition: 'all 0.3s'
            }}>
              {isSpeaking ? (
                <Waves size={40} color="#a78bfa" />
              ) : (
                <Headphones size={40} color="#64748b" />
              )}
            </div>
            <WaveVisualizer isActive={isSpeaking} />
          </div>

          {/* Text Input */}
          <div style={{ padding: '24px' }}>
            <textarea
              value={textToSpeak}
              onChange={(e) => setTextToSpeak(e.target.value)}
              placeholder="Entrez le texte que Lisa doit prononcer..."
              disabled={activeTab !== 'synthesis'}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '16px',
                background: 'var(--bg-deep, #0a0a0f)',
                border: '1px solid var(--border-primary, #2d2d44)',
                borderRadius: '12px',
                color: 'var(--text-primary, #e8e8f0)',
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />

            {/* Sample texts */}
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {sampleTexts.map((text, i) => (
                <button
                  key={i}
                  onClick={() => setTextToSpeak(text)}
                  disabled={activeTab !== 'synthesis'}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--bg-surface, #12121a)',
                    border: '1px solid var(--border-primary, #2d2d44)',
                    borderRadius: '20px',
                    color: 'var(--text-muted, #6a6a82)',
                    fontSize: '12px',
                    cursor: activeTab === 'synthesis' ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
                >
                  {text.substring(0, 30)}...
                </button>
              ))}
            </div>

            {/* Speak Button */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={handleSpeak}
                disabled={isSpeaking || !textToSpeak.trim() || activeTab !== 'synthesis'}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: (textToSpeak.trim() && !isSpeaking && activeTab === 'synthesis') ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  background: (isSpeaking || !textToSpeak.trim())
                    ? 'var(--border-primary, #2d2d44)'
                    : 'linear-gradient(135deg, var(--color-purple, #8b5cf6), #7c3aed)',
                  color: (isSpeaking || !textToSpeak.trim()) ? 'var(--text-muted, #6a6a82)' : 'var(--text-primary, #e8e8f0)',
                  boxShadow: (isSpeaking || !textToSpeak.trim())
                    ? 'none'
                    : '0 8px 32px rgba(139, 92, 246, 0.3)',
                  transition: 'all 0.3s'
                }}
              >
                {isSpeaking ? (
                  <>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: '3px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'var(--text-primary, #e8e8f0)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Lecture en cours...
                  </>
                ) : (
                  <>
                    <Play size={24} />
                    Prononcer
                  </>
                )}
              </button>
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  style={{
                    padding: '16px 24px',
                    borderRadius: '16px',
                    border: 'none',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: 'var(--color-error, #ef4444)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Square size={24} />
                </button>
              )}
            </div>

            {/* Speaking Status */}
            {isSpeaking && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'rgba(139, 92, 246, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Radio size={18} color="#a78bfa" style={{ animation: 'pulse 1s infinite' }} />
                  <span style={{ color: 'var(--color-purple, #8b5cf6)', fontSize: '14px' }}>Lisa parle...</span>
                </div>
                <button
                  onClick={stopSpeaking}
                  style={{
                    padding: '4px 8px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-purple, #8b5cf6)',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  <VolumeX size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{
        marginTop: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px'
      }}>
        {[
          // Raw hex needed: used in template literals like `${stat.color}20`
          { icon: Mic, label: 'Transcription', value: isListening ? 'Active' : 'Inactive', color: '#f5a623' },
          { icon: Volume2, label: 'Synthèse', value: isSpeaking ? 'Active' : 'Prête', color: '#8b5cf6' },
          { icon: MessageSquare, label: 'Phrases', value: transcriptHistory.length.toString(), color: '#3b82f6' },
          { icon: Headphones, label: 'Voix', value: selectedVoice?.name?.split(' ')[0] || 'Default', color: '#f59e0b' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'var(--bg-surface, #12121a)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: `${stat.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <stat.icon size={24} color={stat.color} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted, #6a6a82)', fontSize: '12px', margin: 0 }}>{stat.label}</p>
              <p style={{ color: 'var(--text-primary, #e8e8f0)', fontSize: '16px', fontWeight: 600, margin: '4px 0 0' }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.95); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
