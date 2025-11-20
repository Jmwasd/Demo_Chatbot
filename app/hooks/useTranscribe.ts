// src/hooks/useTranscribe.ts
"use client";

import MicrophoneStream from "microphone-stream";
import { useState, useRef } from "react";
import { Buffer } from "buffer";
import { Readable } from "stream";

function encodePCM16(raw: Float32Array) {
  const buffer = new ArrayBuffer(raw.length * 2);
  const view = new DataView(buffer);

  let offset = 0;
  for (let i = 0; i < raw.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, raw[i])); // Clamp
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return Buffer.from(buffer); // 반드시 Buffer 리턴
}

const useTranscribe = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const micRef = useRef<any>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [transcripts, setTranscripts] = useState<string[]>([]);

  const startTranscription = async () => {
    await fetch("/api/transcribe"); // WebSocket 서버 준비 호출

    const ws = new WebSocket("ws://localhost:3001");
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onmessage = (msg) => {
      setTranscripts((prev) => [...prev, msg.data]);
      setRecording(true);
    };

    const mic = new MicrophoneStream();
    micRef.current = mic;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    mic.setStream(stream);

    (mic as unknown as Readable).on(
      "data",
      (chunk: Buffer<ArrayBufferLike>) => {
        const raw = MicrophoneStream.toRaw(chunk);
        if (!raw) return;

        const pcmBuffer = encodePCM16(raw);
        wsRef.current?.send(pcmBuffer);
      }
    );
  };

  const stopTranscription = () => {
    micRef.current?.stop();
    wsRef.current?.close();
    setRecording(false);
  };

  const resetTranscripts = () => {
    setError(false);
    setErrorMessage("");
    setTranscripts([]);
    setRecording(false);
  };

  return {
    startTranscription,
    stopTranscription,
    resetTranscripts,
    recording,
    transcripts,
    error,
    errorMessage,
  };
};

export default useTranscribe;
