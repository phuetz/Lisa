import { useAppStore } from '../store/appStore';
import { MicIndicator as SdkMicIndicator } from '@lisa-sdk/ui';
import { Fade } from '@mui/material';

/**
 * Displays a microphone icon when Lisa is actively listening after the wake-word.
 * Wraps the SDK component with store connection.
 */
export default function MicIndicator() {
  const listeningActive = useAppStore((s) => s.listeningActive);
  const speechDetected = useAppStore((s) => s.speechDetected);

  return (
    <Fade in={listeningActive} timeout={{ enter: 200, exit: 200 }} unmountOnExit>
      <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 1000 }}>
        <SdkMicIndicator 
          isListening={listeningActive}
          isSpeaking={speechDetected}
          volume={0.5}
          size={48}
        />
      </div>
    </Fade>
  );
}
