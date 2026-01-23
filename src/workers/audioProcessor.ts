
// src/workers/audioProcessor.ts
/**
 * Simple AudioWorkletProcessor to stream audio chunks
 */
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, any>) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0]; // Use first channel
      // We clone the data because the original buffer will be reused
      this.port.postMessage(new Float32Array(channelData));
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
