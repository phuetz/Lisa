import HearingWorker from '../../workers/hearingWorker?worker';
import audioProcessorUrl from '../../workers/audioProcessor.ts?url';

export function createHearingWorker(): Worker {
  return new HearingWorker();
}

export function getAudioProcessorUrl(): string {
  return audioProcessorUrl;
}
