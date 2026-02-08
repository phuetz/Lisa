import { useAppStore } from '../store/appStore';
import { useTranslation } from 'react-i18next';
import { Fade } from '@mui/material';
import { Mic } from '@mui/icons-material';

/**
 * Displays a microphone icon when Lisa is actively listening after the wake-word.
 */
export default function MicIndicator() {
  const listeningActive = useAppStore((s) => s.listeningActive);
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
          background: 'var(--color-brand, #10a37f)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-elevated, 0 4px 20px rgba(0,0,0,0.4))',
        }}
      >
        <Mic />
      </div>
    </Fade>
  );
}
