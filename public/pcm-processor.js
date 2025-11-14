class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const float32 = input[0];
      this.port.postMessage(float32);
    }
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
