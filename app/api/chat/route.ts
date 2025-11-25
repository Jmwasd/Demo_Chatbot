import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "langchain";
import { NextRequest, NextResponse } from "next/server";

interface reqType {
  message: string;
}

export async function POST(request: NextRequest) {
  const req: reqType = await request.json();

  const { message } = req;

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    maxOutputTokens: 2048,
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const input = [
    new HumanMessage({
      content: [
        {
          type: "text",
          text: message,
        },
      ],
    }),
  ];

  const response = await model.invoke(input);

  return NextResponse.json({
    message: "success",
    data: response.lc_kwargs.content,
  });
}
