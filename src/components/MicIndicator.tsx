import { useVisionAudioStore } from '../store/visionAudioStore';
import { useTranslation } from 'react-i18next';
import { Fade } from '@mui/material';
import { Mic, MicOff } from '@mui/icons-material';

/**
 * Displays a microphone icon when Lisa is actively listening after the wake-word.
 */
export default function MicIndicator() {
  const listeningActive = useVisionAudioStore((s) => s.listeningActive);
  const { t } = useTranslation();

  return (
    <Fade in={listeningActive} timeout={{ enter: 200, exit: 200 }} unmountOnExit>
      <div
        role="status"
        aria-live="polite"
        aria-label={t('listening')}
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#1976d2',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 10px rgba(0,0,0,0.3)',
        }}
      >
        {listeningActive ? <Mic /> : <MicOff />}
      </div>
    </Fade>
  );
}
