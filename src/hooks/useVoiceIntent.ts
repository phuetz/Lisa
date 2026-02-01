import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { useSmallTalk } from './useSmallTalk';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useIntentHandler } from './useIntentHandler';
import { useGoogleCalendar } from './useGoogleCalendar';

interface VoiceCalendarEvent {
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

const DEFAULT_EVENT_DATE = '2023-01-01';

const parseCalendarEvent = (transcript: string): VoiceCalendarEvent | null => {
  const eventRegex = /(?:ajoute|crée|cree|add|create)\s+(?:un\s+)?(?:événement|event)\s+à\s+(\d{1,2})h(\d{2})?\s+(.+)/i;
  const match = transcript.match(eventRegex);
  if (!match) {
    return null;
  }

  const hour = match[1]?.padStart(2, '0');
  const minuteRaw = match[2] ?? '00';
  const minutes = minuteRaw.padEnd(2, '0');
  const summary = match[3]?.trim();

  if (!hour || !summary) {
    return null;
  }

  return {
    summary,
    start: { dateTime: `${DEFAULT_EVENT_DATE}T${hour}:${minutes}:00` },
    end: { dateTime: `${DEFAULT_EVENT_DATE}T23:59:00` },
  };
};

type CalendarPeriod = 'today' | 'week' | 'month';

const detectCalendarListPeriod = (transcript: string): CalendarPeriod | null => {
  const normalized = transcript.toLowerCase();
  if (/(aujourd'hui|today)/.test(normalized)) {
    return 'today';
  }
  if (/(semaine|week)/.test(normalized)) {
    return 'week';
  }
  if (/(mois|month)/.test(normalized)) {
    return 'month';
  }
  return null;
};

export function useVoiceIntent() {
  const { i18n } = useTranslation();
  const listeningActive = useAppStore(state => state.listeningActive);
  const setState = useAppStore(state => state.setState);
  const { isSmallTalk, processSmallTalk } = useSmallTalk();
  const { handleIntent } = useIntentHandler();
  const { createEvent, isSignedIn } = useGoogleCalendar();

  const processTranscript = useCallback(async (rawTranscript: string) => {
    const transcript = rawTranscript.trim();
    if (!transcript) {
      return;
    }

    if (isSmallTalk(transcript)) {
      await processSmallTalk(transcript);
      return;
    }

    const calendarEvent = parseCalendarEvent(transcript);
    if (calendarEvent && isSignedIn) {
      try {
        await createEvent(calendarEvent);
      } catch (error) {
        console.error('Error handling intent:', error);
      }
      return;
    }

    const listPeriod = detectCalendarListPeriod(transcript);
    if (listPeriod) {
      setState({ intent: 'list_events', intentPayload: { period: listPeriod } });
      return;
    }

    await handleIntent(transcript, false);
  }, [createEvent, handleIntent, isSignedIn, isSmallTalk, processSmallTalk, setState]);

  const { start, stop, supported, error: speechError } = useSpeechRecognition({
    language: i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US',
    continuous: true,
    interimResults: false,
    autoRestart: true,
    onResult: (transcript) => {
      void processTranscript(transcript);
    },
    onError: (event) => {
      console.error('Speech recognition error', event.error);
      setState({ listeningActive: false });
    }
  });

  useEffect(() => {
    if (!listeningActive) {
      stop();
      return;
    }

    if (!supported) {
      console.warn('Speech recognition not supported in this browser.');
      setState({ listeningActive: false });
      return;
    }

    start();

    return () => {
      stop();
    };
  }, [listeningActive, start, stop, supported, setState]);

  useEffect(() => {
    if (speechError) {
      console.error('Speech recognition error', speechError);
    }
  }, [speechError]);

  // This hook doesn't need to return anything, it just sets up listeners.
}
