/**
 * AudioRecordButton Component
 * Bouton d'enregistrement audio avec visualisation
 */

import { useState, useEffect } from 'react';
import { Mic, Square, Pause, Play, X, Send } from 'lucide-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

interface AudioRecordButtonProps {
  onAudioReady: (audioBlob: Blob, base64: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export const AudioRecordButton = ({ onAudioReady, onCancel, disabled }: AudioRecordButtonProps) => {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    getAudioBase64,
  } = useAudioRecorder();

  const [isExpanded, setIsExpanded] = useState(false);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    setIsExpanded(true);
    await startRecording();
  };

  const handleStopAndSend = async () => {
    const blob = await stopRecording();
    if (blob) {
      const base64 = await getAudioBase64();
      if (base64) {
        onAudioReady(blob, base64);
      }
    }
    setIsExpanded(false);
  };

  const handleCancel = () => {
    cancelRecording();
    setIsExpanded(false);
    onCancel?.();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        cancelRecording();
      }
    };
  }, [isRecording, cancelRecording]);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: '#ef444420',
        borderRadius: '8px',
        color: '#ef4444',
        fontSize: '12px',
      }}>
        <X size={14} />
        {error}
      </div>
    );
  }

  // Expanded recording UI
  if (isExpanded) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 16px',
        backgroundColor: '#1a1a26',
        borderRadius: '24px',
        border: '1px solid #ef4444',
      }}>
        {/* Cancel button */}
        <button
          onClick={handleCancel}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#6a6a82',
            cursor: 'pointer',
            borderRadius: '50%',
          }}
          title="Annuler"
        >
          <X size={18} />
        </button>

        {/* Recording indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: isPaused ? '#6a6a82' : '#ef4444',
            animation: isPaused ? 'none' : 'pulse 1s infinite',
          }} />
          <span style={{
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '14px',
            minWidth: '50px',
          }}>
            {formatDuration(duration)}
          </span>
        </div>

        {/* Waveform visualization placeholder */}
        <div style={{
          flex: 1,
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          overflow: 'hidden',
        }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '3px',
                height: isPaused ? '8px' : `${8 + Math.random() * 16}px`,
                backgroundColor: '#ef4444',
                borderRadius: '2px',
                transition: 'height 0.1s',
              }}
            />
          ))}
        </div>

        {/* Pause/Resume button */}
        <button
          onClick={isPaused ? resumeRecording : pauseRecording}
          style={{
            padding: '8px',
            backgroundColor: '#2d2d44',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            borderRadius: '50%',
          }}
          title={isPaused ? 'Reprendre' : 'Pause'}
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
        </button>

        {/* Stop and send button */}
        <button
          onClick={handleStopAndSend}
          style={{
            padding: '10px',
            backgroundColor: '#f5a623',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Envoyer"
        >
          <Send size={16} />
        </button>
      </div>
    );
  }

  // Default mic button
  return (
    <button
      onClick={handleStartRecording}
      disabled={disabled}
      style={{
        padding: '10px',
        backgroundColor: 'transparent',
        border: 'none',
        color: disabled ? '#2d2d44' : '#6a6a82',
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: '50%',
        transition: 'all 0.2s',
      }}
      title="Enregistrer un message vocal"
    >
      <Mic size={20} />
    </button>
  );
};

// Add CSS animation for pulse effect
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('#audio-record-styles')) {
  style.id = 'audio-record-styles';
  document.head.appendChild(style);
}

export default AudioRecordButton;
