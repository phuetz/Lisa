// src/workers/hearingWorker.ts
import { pipeline, env } from '@xenova/transformers';

// Disable local model checks
env.allowLocalModels = false;

let sttPipeline: any = null;
let sentimentPipeline: any = null;
const intentPipeline: any = null; // Reserved for future NLU use
let emotionPipeline: any = null;

// Function to load the STT model (Whisper-tiny)
async function loadSttModel() {
  try {
    sttPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
    sentimentPipeline = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    // intentPipeline removed: use LLM for NLU
    emotionPipeline = await pipeline('audio-classification', 'Xenova/wav2vec2-base-finetuned-emotion');

    // Notify main thread that models are loaded
    self.postMessage({ type: 'MODEL_LOADED', success: true });
  } catch (error) {
    console.error('[HearingWorker] Failed to load STT or NLU/SER models:', error);
    self.postMessage({ type: 'MODEL_LOADED', success: false, error: String(error) });
  }
}

// Function to process audio chunk and perform STT
async function processAudio(audioData: Float32Array) {
  if (!sttPipeline) {
    console.warn('STT model not loaded yet. Skipping audio processing.');
    return;
  }

  try {
    const transcription = await sttPipeline(audioData);
    const text = transcription.text;

    let sentiment: string | undefined;
    if (text && sentimentPipeline) {
      const sentimentResult = await sentimentPipeline(text);
      sentiment = sentimentResult[0]?.label;
    }

    let _intent: string | undefined;
    if (text && intentPipeline) {
      const intentResult = await intentPipeline(text);
      _intent = intentResult[0]?.label;
    }

    let emotion: string | undefined;
    if (audioData && emotionPipeline) {
      const emotionResult = await emotionPipeline(audioData);
      emotion = emotionResult[0]?.label;
    }

    // --- TARGET: Legacy HearingPayload Format for UI Compatibility ---
    // Emission de la transcription
    self.postMessage({
      modality: 'hearing',
      payload: {
        type: 'transcription',
        text: text,
        isFinal: true, // Whisper processing is always final for the chunk
        language: 'en' // Default for now
      },
      confidence: transcription.score || 0.9,
      timestamp: Date.now()
    });

    // Emission des métadonnées (Emotion/Sentiment) séparément ou enrichir le payload si supporté ?
    // Le format Legacy sépare les payloads.
    if (sentiment) {
       self.postMessage({
        modality: 'hearing',
        payload: {
          type: 'emotion',
          emotion: sentiment, // e.g. "POSITIVE", "NEGATIVE"
          valence: sentiment === 'POSITIVE' ? 1 : -1,
          arousal: 0.5
        },
        confidence: 0.8,
        timestamp: Date.now()
      });
    }

    if (emotion) {
       // emotionPipeline output needs mapping to standard emotions if needed
    }

  } catch (error) {
    console.error('Error during audio processing:', error);
  }
}

// Listen for messages from the main thread
self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'LOAD_STT_MODEL':
      loadSttModel();
      break;
    case 'PROCESS_AUDIO':
      processAudio(payload);
      break;
    default:
      console.warn('Unknown message type:', type);
  }
};
