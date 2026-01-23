/**
 * TTSButton Component
 * Bouton pour faire parler Lisa (Text-to-Speech)
 */

import { Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { useTTS } from '../../hooks/useTTS';
import { useMobile } from '../../hooks/useMobile';

interface TTSButtonProps {
  text: string;
  size?: number;
  showLabel?: boolean;
}

export const TTSButton = ({ text, size = 18, showLabel = false }: TTSButtonProps) => {
  const { isSpeaking, isPaused, isSupported, speakResponse, stop, togglePause } = useTTS();
  const { hapticTap } = useMobile();

  if (!isSupported) return null;

  const handleClick = async () => {
    hapticTap();
    
    if (isSpeaking) {
      if (isPaused) {
        togglePause();
      } else {
        stop();
      }
    } else {
      await speakResponse(text);
    }
  };

  const _handlePauseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticTap();
    togglePause();
  };

  const Icon = isSpeaking ? (isPaused ? Play : Pause) : Volume2;
  const label = isSpeaking ? (isPaused ? 'Reprendre' : 'Pause') : 'Écouter';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <button
        onClick={handleClick}
        title={label}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: showLabel ? '6px 12px' : '6px',
          backgroundColor: isSpeaking ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
          border: 'none',
          borderRadius: '8px',
          color: isSpeaking ? '#10b981' : '#8e8ea0',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontSize: '12px',
        }}
      >
        <Icon size={size} />
        {showLabel && <span>{label}</span>}
      </button>

      {/* Stop button when speaking */}
      {isSpeaking && !isPaused && (
        <button
          onClick={(e) => { e.stopPropagation(); hapticTap(); stop(); }}
          title="Arrêter"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: 'none',
            borderRadius: '8px',
            color: '#ef4444',
            cursor: 'pointer',
          }}
        >
          <VolumeX size={size} />
        </button>
      )}
    </div>
  );
};

export default TTSButton;
