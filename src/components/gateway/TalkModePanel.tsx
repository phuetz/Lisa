/**
 * Lisa Talk Mode Panel
 * Voice conversation interface with open-source TTS/STT
 */

import { useState, useEffect, useCallback } from 'react';
import { getTalkMode } from '../../gateway';
import type { Voice, TalkModeStatus } from '../../gateway/TalkMode';

export function TalkModePanel() {
  const [status, setStatus] = useState<TalkModeStatus>('idle');
  const [isEnabled, setIsEnabled] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [history, setHistory] = useState<{ role: string; text: string }[]>([]);
  const [transcript, setTranscript] = useState('');

  const refreshData = useCallback(() => {
    const talkMode = getTalkMode();
    setStatus(talkMode.getStatus());
    setIsEnabled(talkMode.isEnabled());
    setVoices(talkMode.getVoices());
    setHistory(talkMode.getHistory());
    
    const config = talkMode.getConfig();
    setSelectedVoice(config.voice);
  }, []);

  useEffect(() => {
    refreshData();

    const talkMode = getTalkMode();
    talkMode.on('status:changed', refreshData);
    talkMode.on('speech:result', (result) => {
      setTranscript(result.text);
    });

    return () => {
      talkMode.off('status:changed', refreshData);
    };
  }, [refreshData]);

  const handleToggle = () => {
    const talkMode = getTalkMode();
    if (isEnabled) {
      talkMode.disable();
    } else {
      talkMode.enable();
    }
    refreshData();
  };

  const handleStartListening = async () => {
    const talkMode = getTalkMode();
    await talkMode.startListening();
    refreshData();
  };

  const handleStopListening = () => {
    const talkMode = getTalkMode();
    talkMode.stopListening();
    refreshData();
  };

  const handleSpeak = async (text: string) => {
    const talkMode = getTalkMode();
    await talkMode.speak(text);
    refreshData();
  };

  const handleVoiceChange = (voiceId: string) => {
    const talkMode = getTalkMode();
    talkMode.setVoice(voiceId);
    setSelectedVoice(voiceId);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'listening': return '🎤';
      case 'processing': return '⏳';
      case 'speaking': return '🔊';
      case 'error': return '❌';
      default: return '😴';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'listening': return '#10b981';
      case 'processing': return '#f59e0b';
      case 'speaking': return '#3b82f6';
      case 'error': return '#ef4444';
      default: return '#6a6a82';
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>🎤 Talk Mode</h2>
        <button
          onClick={handleToggle}
          style={{
            ...styles.toggleButton,
            backgroundColor: isEnabled ? '#10b981' : '#2d2d44'
          }}
        >
          {isEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Status */}
      <div style={styles.statusCard}>
        <div style={{ ...styles.statusIcon, color: getStatusColor() }}>
          {getStatusIcon()}
        </div>
        <div style={styles.statusText}>
          {status === 'idle' && 'En attente'}
          {status === 'listening' && 'Écoute en cours...'}
          {status === 'processing' && 'Traitement...'}
          {status === 'speaking' && 'Lisa parle...'}
          {status === 'error' && 'Erreur'}
        </div>
        {transcript && status === 'listening' && (
          <div style={styles.transcript}>"{transcript}"</div>
        )}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        {status === 'listening' ? (
          <button onClick={handleStopListening} style={styles.stopButton}>
            ⏹️ Arrêter
          </button>
        ) : (
          <button 
            onClick={handleStartListening} 
            style={styles.listenButton}
            disabled={!isEnabled}
          >
            🎤 Parler
          </button>
        )}
        <button 
          onClick={() => handleSpeak('Bonjour, je suis Lisa, votre assistante.')}
          style={styles.testButton}
          disabled={!isEnabled || status === 'speaking'}
        >
          🔊 Test
        </button>
      </div>

      {/* Voice Selection */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Voix</h3>
        <div style={styles.voiceGrid}>
          {voices.slice(0, 8).map((voice) => (
            <button
              key={voice.id}
              onClick={() => handleVoiceChange(voice.id)}
              style={{
                ...styles.voiceButton,
                borderColor: selectedVoice === voice.id ? '#3b82f6' : 'transparent',
                backgroundColor: selectedVoice === voice.id ? '#1e3a5f' : '#252525'
              }}
            >
              <span style={styles.voiceEngine}>{voice.engine}</span>
              <span style={styles.voiceName}>{voice.name}</span>
              <span style={styles.voiceLang}>{voice.language}</span>
            </button>
          ))}
        </div>
      </div>

      {/* History */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Historique</h3>
        <div style={styles.historyList}>
          {history.length === 0 ? (
            <div style={styles.emptyState}>Aucune conversation</div>
          ) : (
            history.slice(-5).map((item, i) => (
              <div key={i} style={styles.historyItem}>
                <span style={styles.historyRole}>
                  {item.role === 'user' ? '👤' : '🤖'}
                </span>
                <span style={styles.historyText}>{item.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Engine Info */}
      <div style={styles.engineInfo}>
        <span>TTS: Piper / Coqui / espeak (Open Source)</span>
        <span>STT: Web Speech / Whisper / Vosk</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1a1a26',
    borderRadius: '12px',
    padding: '24px',
    color: '#fff'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600
  },
  toggleButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '20px',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer'
  },
  statusCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '30px',
    backgroundColor: '#252525',
    borderRadius: '12px',
    marginBottom: '20px'
  },
  statusIcon: {
    fontSize: '48px',
    marginBottom: '12px'
  },
  statusText: {
    fontSize: '16px',
    fontWeight: 500
  },
  transcript: {
    marginTop: '12px',
    padding: '8px 16px',
    backgroundColor: '#2d2d44',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#aaa',
    fontStyle: 'italic'
  },
  controls: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px'
  },
  listenButton: {
    flex: 1,
    padding: '16px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  stopButton: {
    flex: 1,
    padding: '16px',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  testButton: {
    padding: '16px 24px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer'
  },
  section: {
    marginTop: '20px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6a6a82',
    marginBottom: '12px',
    textTransform: 'uppercase'
  },
  voiceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px'
  },
  voiceButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '12px',
    border: '2px solid transparent',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    textAlign: 'left'
  },
  voiceEngine: {
    fontSize: '10px',
    color: '#6a6a82',
    textTransform: 'uppercase'
  },
  voiceName: {
    fontSize: '13px',
    fontWeight: 500,
    marginTop: '2px'
  },
  voiceLang: {
    fontSize: '11px',
    color: '#6a6a82'
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '150px',
    overflowY: 'auto'
  },
  emptyState: {
    padding: '20px',
    textAlign: 'center',
    color: '#6a6a82'
  },
  historyItem: {
    display: 'flex',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#252525',
    borderRadius: '8px'
  },
  historyRole: {
    fontSize: '16px'
  },
  historyText: {
    flex: 1,
    fontSize: '13px',
    color: '#ccc'
  },
  engineInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #2d2d44',
    fontSize: '11px',
    color: '#3d3d5c'
  }
};

export default TalkModePanel;
