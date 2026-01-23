class AudioProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, any>) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      this.port.postMessage(new Float32Array(channelData));
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
