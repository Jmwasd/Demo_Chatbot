"use client";

import useTranscribe from "../hooks/useTranscribe";

const StreamingAudio = () => {
  const { startTranscription, stopTranscription, recording, transcripts } =
    useTranscribe();

  const onRecordClick = () => {
    recording ? stopTranscription() : startTranscription();
  };

  return (
    <div>
      <button onClick={onRecordClick}>{recording ? "Pause" : "Start"}</button>

      <div>
        {transcripts.map((el, idx) => (
          <p key={idx}>{el}</p>
        ))}
      </div>
    </div>
  );
};

export default StreamingAudio;
