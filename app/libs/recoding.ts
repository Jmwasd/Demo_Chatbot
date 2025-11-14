let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let workletNode: AudioWorkletNode | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;

export function floatTo16BitPCM(float32Array: Float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);

  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = float32Array[i];
    s = Math.max(-1, Math.min(1, s));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Int16Array(buffer);
}

export const startRecord = async () => {
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  audioContext = new AudioContext({ sampleRate: 16000 });
  await audioContext.audioWorklet.addModule("/pcm-processor.js");

  sourceNode = audioContext.createMediaStreamSource(mediaStream);
  workletNode = new AudioWorkletNode(audioContext, "pcm-processor");

  const streamToServer = new ReadableStream({
    start(controller) {
      if (workletNode instanceof AudioWorkletNode)
        workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
          const pcm16 = floatTo16BitPCM(event.data);
          controller.enqueue(new Uint8Array(pcm16.buffer));
        };
    },
  });

  sourceNode.connect(workletNode);

  return streamToServer;
};

export const stopRecord = async () => {
  try {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }

    if (sourceNode) sourceNode.disconnect();
    if (workletNode) workletNode.disconnect();

    if (audioContext && audioContext.state !== "closed") {
      await audioContext.close();
    }

    console.log("녹음 완전히 중지됨");
  } catch (e) {
    console.error("stop error:", e);
  }
};
