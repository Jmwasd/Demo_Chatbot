"use client";

import { useChat } from "@ai-sdk/react";
import { Input } from "@/components/ui/input";
import { FormEvent, useRef } from "react";

const ChatAI = () => {
  const input = useRef<HTMLInputElement | null>(null);
  const { messages, sendMessage } = useChat();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.current?.value) {
      sendMessage({ text: input.current?.value });
      input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      <div className="space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="whitespace-pre-wrap">
            <div>
              <div className="font-bold">{m.role}</div>
              {m.parts.map((part, idx) => {
                switch (part.type) {
                  case "text":
                    return <p key={idx}>{part.text}</p>;
                  // case "tool-addResource":
                  // case "tool-getInformation":
                  //   return (
                  //     <p key={idx}>
                  //       call{part.state === "output-available" ? "ed" : "ing"}{" "}
                  //       tool: {part.type}
                  //       <pre className="my-4 bg-zinc-100 p-2 rounded-sm">
                  //         {JSON.stringify(part.input, null, 2)}
                  //       </pre>
                  //     </p>
                  //   );
                }
              })}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          onSubmit(e);
        }}
      >
        <Input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          ref={input}
        />
      </form>
    </div>
  );
};

export default ChatAI;
