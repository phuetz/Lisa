import { pipeline, env } from '@xenova/transformers';

// Disable local model checks
env.allowLocalModels = false;

// Define minimal pipeline types since Xenova types are complex/dynamic
type Pipeline = (input: any) => Promise<any>;

let sttPipeline: Pipeline | null = null;
let sentimentPipeline: Pipeline | null = null;
let intentPipeline: Pipeline | null = null;
let emotionPipeline: Pipeline | null = null;

async function loadSttModel() {
  try {
    sttPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
    sentimentPipeline = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    intentPipeline = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-mnli');
    emotionPipeline = await pipeline('audio-classification', 'Xenova/wav2vec2-base-finetuned-emotion');
    
    self.postMessage({ type: 'MODEL_LOADED', success: true });
  } catch (error) {
    self.postMessage({ type: 'MODEL_LOADED', success: false, error: String(error) });
  }
}

async function processAudio(audioData: Float32Array) {
  if (!sttPipeline) return;

  try {
    const transcription = await sttPipeline(audioData);
    const text = transcription.text;

    let sentiment: string | undefined;
    if (text && sentimentPipeline) {
      const sentimentResult = await sentimentPipeline(text);
      sentiment = sentimentResult[0]?.label;
    }

    let intent: string | undefined;
    if (text && intentPipeline) {
      const intentResult = await intentPipeline(text);
      intent = intentResult[0]?.label;
    }

    let emotion: string | undefined;
    if (audioData && emotionPipeline) {
      const emotionResult = await emotionPipeline(audioData);
      emotion = emotionResult[0]?.label;
    }

    self.postMessage({
      modality: 'hearing',
      payload: { text, sentiment, intent, emotion },
      confidence: transcription.score || 1.0,
      ts: Date.now(),
    });

  } catch (error) {
    console.error('Error during audio processing:', error);
  }
}

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;
  switch (type) {
    case 'LOAD_STT_MODEL': loadSttModel(); break;
    case 'PROCESS_AUDIO': processAudio(payload); break;
  }
};
