import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { useSmallTalk } from './useSmallTalk';
import { useIntentHandler } from './useIntentHandler';

export function useVoiceIntent() {
  const { i18n } = useTranslation();
  const { listeningActive, setState } = useVisionAudioStore(state => ({
    listeningActive: state.listeningActive,
    setState: state.setState,
  }));
  const { isSmallTalk, processSmallTalk } = useSmallTalk();
  const { handleIntent } = useIntentHandler();
  const recogRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!listeningActive) {
      recogRef.current?.stop();
      return;
    }

    // @ts-ignore
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('Speech recognition not supported in this browser.');
      return;
    }
    const recognition: SpeechRecognition = new SpeechRec();
    recogRef.current = recognition;

    recognition.lang = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (isSmallTalk(transcript)) {
        processSmallTalk(transcript);
      } else {
        handleIntent(transcript, false);
      }
    };

    // @ts-ignore
    recognition.onend = () => {
      if (useVisionAudioStore.getState().listeningActive) {
        setState({ listeningActive: false });
      }
    };

    // @ts-ignore
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error);
      if (useVisionAudioStore.getState().listeningActive) {
        setState({ listeningActive: false });
      }
    };

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [listeningActive, i18n.language, setState, isSmallTalk, processSmallTalk, handleIntent]);

  // This hook doesn't need to return anything, it just sets up listeners.
}
