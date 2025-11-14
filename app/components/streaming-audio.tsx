"use client";

import { useState } from "react";
import { startRecord, stopRecord } from "../libs/recoding";

const readTranscribeStream = async (streamToServer: ReadableStream) => {
  try {
    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: streamToServer,
      // @ts-expect-error
      duplex: "half",
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      console.log("Partial Text:", decoder.decode(value));
    }
  } catch (err) {
    console.log(err);
  }
};

const StreamingAudio = () => {
  const [isRecording, setIsRecording] = useState(false);

  const onRecordClick = async () => {
    if (!isRecording) {
      // 1) 스트림 생성 + 시작
      const streamToServer = await startRecord();

      await readTranscribeStream(streamToServer);
    } else {
      // 3) 녹음/스트림 중단
      stopRecord();
    }

    setIsRecording((prev) => !prev);
  };

  return (
    <button onClick={onRecordClick}>{isRecording ? "Pause" : "Play"}</button>
  );
};

export default StreamingAudio;
