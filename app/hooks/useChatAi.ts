"use client";

import { useState } from "react";

interface ClientChatType {
  question: string;
  answer: string;
  index: number;
}

const useChatAi = () => {
  const [chat, setChat] = useState<ClientChatType[]>([]);

  const getMessage = async (message: string) => {
    try {
      const res = await fetch("/api/chat", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const resAnswer = await res.json();

      setChat((prev) => [
        ...prev,
        {
          question: message,
          answer: resAnswer.data,
          index: chat.length + 1,
        },
      ]);

      return res;
    } catch (err) {}
  };

  return { getMessage, chat };
};

export default useChatAi;
