"use client";

import useTranscribe from "../hooks/useTranscribe";

const StreamingAudio = () => {
  const { startTranscription, stopTranscription, transcripts } =
    useTranscribe();

  const onStartRecord = async () => {
    startTranscription();
  };

  const onStopRecord = async () => {
    stopTranscription();
  };

  const getTranscribeText = () => {
    const text = transcripts.map((el) => el.transcript);
    return text.join("");
  };

  return (
    <div>
      <button onClick={onStartRecord}>Start</button>
      <button onClick={onStopRecord}>Stop</button>

      <div>{getTranscribeText()}</div>
    </div>
  );
};

export default StreamingAudio;
