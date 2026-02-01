/**
 * AudioWorklet Processor for Hearing System
 * Replaces deprecated ScriptProcessorNode with modern AudioWorklet API
 *
 * This processor accumulates audio samples and sends them to the main thread
 * when the buffer is full (targetSamples reached).
 */

// Buffer size for accumulating samples before sending
// 16384 samples at 16kHz = ~1 second of audio
const TARGET_SAMPLES = 16384;

class AudioProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array;
  private bufferIndex: number;

  constructor() {
    super();
    this.buffer = new Float32Array(TARGET_SAMPLES);
    this.bufferIndex = 0;
  }

  process(inputs: Float32Array[][], _outputs: Float32Array[][], _parameters: Record<string, Float32Array>): boolean {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0]; // Mono audio
    if (!channelData) return true;

    // Accumulate samples into buffer
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];

      // When buffer is full, send to main thread
      if (this.bufferIndex >= TARGET_SAMPLES) {
        // Copy buffer to avoid issues with transferable objects
        const audioData = this.buffer.slice(0);
        this.port.postMessage({ type: 'AUDIO_DATA', payload: audioData });
        this.bufferIndex = 0;
      }
    }

    return true; // Keep processor alive
  }
}

// Register the processor
registerProcessor('audio-processor', AudioProcessor);
