/**
 * Hearing Worker - Audio processing in background thread
 * Handles audio analysis for speech detection and processing
 */

interface HearingMessage {
  type: 'init' | 'process' | 'stop';
  data?: Float32Array | ArrayBuffer;
  sampleRate?: number;
}

interface HearingResult {
  type: 'ready' | 'result' | 'error';
  data?: {
    isSpeech: boolean;
    volume: number;
    frequency?: number;
  };
  error?: string;
}

let isInitialized = false;
let sampleRate = 16000;

self.onmessage = (event: MessageEvent<HearingMessage>) => {
  const { type, data, sampleRate: newSampleRate } = event.data;

  switch (type) {
    case 'init':
      if (newSampleRate) sampleRate = newSampleRate;
      isInitialized = true;
      postResult({ type: 'ready' });
      break;

    case 'process':
      if (!isInitialized) {
        postResult({ type: 'error', error: 'Worker not initialized' });
        return;
      }
      
      if (data) {
        const audioData = data instanceof Float32Array 
          ? data 
          : new Float32Array(data);
        
        const result = processAudio(audioData);
        postResult({ type: 'result', data: result });
      }
      break;

    case 'stop':
      isInitialized = false;
      break;
  }
};

function processAudio(audioData: Float32Array): { isSpeech: boolean; volume: number; frequency?: number } {
  // Calculate RMS volume
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i];
  }
  const rms = Math.sqrt(sum / audioData.length);
  const volume = Math.min(1, rms * 10); // Normalize to 0-1
  
  // Simple voice activity detection based on volume threshold
  const isSpeech = volume > 0.01;
  
  // Basic frequency estimation using zero-crossing rate
  let zeroCrossings = 0;
  for (let i = 1; i < audioData.length; i++) {
    if ((audioData[i] >= 0 && audioData[i - 1] < 0) ||
        (audioData[i] < 0 && audioData[i - 1] >= 0)) {
      zeroCrossings++;
    }
  }
  
  const frequency = (zeroCrossings * sampleRate) / (2 * audioData.length);
  
  return { isSpeech, volume, frequency };
}

function postResult(result: HearingResult): void {
  self.postMessage(result);
}

export {};
