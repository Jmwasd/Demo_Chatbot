"use client";

import { KeyboardEvent, useRef } from "react";
import useChatAi from "../hooks/useChatAi";
import { Input } from "@/components/ui/input";

const ChatAI = () => {
  const input = useRef<HTMLInputElement | null>(null);

  const { getMessage, chat } = useChatAi();

  const onActiveEnter = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.current?.value) {
      await getMessage(input.current.value);
    }
  };

  return (
    <div>
      {chat.length > 0 &&
        chat.map((el) => (
          <div key={el.index}>
            <div>{el.answer}</div>
            <div dangerouslySetInnerHTML={{ __html: el.question }} />
          </div>
        ))}
      <Input ref={input} onKeyDown={(e) => onActiveEnter(e)} />
    </div>
  );
};

export default ChatAI;
