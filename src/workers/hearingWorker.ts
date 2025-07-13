
// src/workers/hearingWorker.ts
import { pipeline, env } from '@xenova/transformers';
import { HearingPerceptPayload, Percept } from '../senses/hearing';

// Disable local model checks
env.allowLocalModels = false;

// Use the CDN for models
env.use  = 'cdn';

let sttPipeline: any = null;
let sentimentPipeline: any = null;
let intentPipeline: any = null;
let emotionPipeline: any = null;

// Function to load the STT model (Whisper-tiny)
async function loadSttModel() {
  try {
    console.log('Loading Whisper-tiny STT model...');
    sttPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
    console.log('Whisper-tiny STT model loaded successfully.');

    console.log('Loading sentiment analysis model...');
    sentimentPipeline = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    console.log('Sentiment analysis model loaded successfully.');

    console.log('Loading intent recognition model...');
    intentPipeline = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-mnli');
    console.log('Intent recognition model loaded successfully.');

    console.log('Loading speech emotion recognition model...');
    emotionPipeline = await pipeline('audio-classification', 'Xenova/wav2vec2-base-finetuned-emotion');
    console.log('Speech emotion recognition model loaded successfully.');

  } catch (error) {
    console.error('Failed to load STT or NLU/SER models:', error);
  }
}
}

// Function to process audio chunk and perform STT
async function processAudio(audioData: Float32Array) {
  if (!sttPipeline || !sentimentPipeline || !intentPipeline || !emotionPipeline) {
    console.warn('STT or NLU/SER models not loaded yet. Skipping audio processing.');
    return;
  }

  try {
    const transcription = await sttPipeline(audioData);
    const text = transcription.text;

    let sentiment: string | undefined;
    if (text) {
      const sentimentResult = await sentimentPipeline(text);
      sentiment = sentimentResult[0]?.label; // Assuming the first label is the sentiment
    }

    let intent: string | undefined;
    if (text) {
      const intentResult = await intentPipeline(text);
      intent = intentResult[0]?.label; // Assuming the first label is the intent
    }

    let emotion: string | undefined;
    if (audioData) {
      const emotionResult = await emotionPipeline(audioData);
      // Assuming the emotion pipeline returns a classification with labels and scores
      emotion = emotionResult[0]?.label; // Get the top emotion label
    }

    const percept: Percept<HearingPerceptPayload> = {
      modality: 'hearing',
      payload: { text, sentiment, intent, emotion },
      confidence: transcription.score || 1.0,
      ts: Date.now(),
    };

    self.postMessage(percept);

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
