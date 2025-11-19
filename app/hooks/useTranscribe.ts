// src/hooks/useTranscribe.ts
"use client";

import MicrophoneStream from "microphone-stream";
import { useState, useRef } from "react";
import update from "immutability-helper";
import { Buffer } from "buffer";

const pcmEncodeChunk = (chunk: Buffer) => {
  const input = MicrophoneStream.toRaw(chunk);
  let offset = 0;
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return Buffer.from(buffer);
};

const useTranscribe = () => {
  const [micStream, setMicStream] = useState<MicrophoneStream | undefined>();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [transcripts, setTranscripts] = useState<
    {
      isPartial: boolean;
      transcript: string;
    }[]
  >([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = async (mic: MicrophoneStream) => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let accumulatedChunks: Buffer[] = [];
    const SEND_INTERVAL_MS = 500;
    let lastSendTime = Date.now();

    for await (const chunk of mic as unknown as Buffer[]) {
      // Check if the stream has been aborted
      if (signal.aborted) {
        break;
      }

      try {
        const encodedChunk = pcmEncodeChunk(chunk);

        // Add to accumulated buffer
        accumulatedChunks.push(encodedChunk);

        const currentTime = Date.now();
        // Only send if we've accumulated enough time or data
        if (currentTime - lastSendTime >= SEND_INTERVAL_MS) {
          // Combine all accumulated chunks
          const combinedChunk = Buffer.concat(accumulatedChunks);

          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              audioChunk: Array.from(combinedChunk),
            }),
            signal,
          });

          // Reset accumulation
          accumulatedChunks = [];
          lastSendTime = currentTime;

          if (!response.ok) {
            throw new Error(`Transcription request failed: ${response.status}`);
          }

          const data = await response.json();
          if (data.status === "warning") {
            console.warn("Transcription warning:", data.message);
          }

          if (data.transcript) {
            setTranscripts((prev) => {
              const index = prev.length - 1;
              if (prev.length === 0 || !prev[prev.length - 1].isPartial) {
                return update(prev, {
                  $push: [{ isPartial: false, transcript: data.transcript }],
                });
              } else {
                return update(prev, {
                  $splice: [
                    [
                      index,
                      1,
                      { isPartial: false, transcript: data.transcript },
                    ],
                  ],
                });
              }
            });
          }
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          console.log("Fetch request aborted");
          continue;
        }

        setError(true);
        setErrorMessage(e instanceof Error ? e.message : String(e));
        break;
      }
    }
  };

  const startTranscription = async () => {
    const mic = new MicrophoneStream();
    try {
      setMicStream(mic);
      const stream = await window.navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          channelCount: 1,
          sampleRate: 44100,
        },
      });

      mic.setStream(stream);

      setError(false);
      setErrorMessage("");
      setTranscripts([]);
      setRecording(true);
      await startStream(mic);
    } catch (e) {
      console.error("Error starting transcription:", e);
      setError(true);
      setErrorMessage(e instanceof Error ? e.message : String(e));
    } finally {
      if (mic) {
        try {
          mic.stop();
        } catch (stopError) {
          console.error("Error stopping microphone:", stopError);
        }
      }
      setRecording(false);
      setMicStream(undefined);
    }
  };

  const stopTranscription = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (micStream) {
      micStream.stop();
      setRecording(false);
      setMicStream(undefined);
    }
  };

  const resetTranscripts = () => {
    setError(false);
    setErrorMessage("");
    setTranscripts([]);
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
