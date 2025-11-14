import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import {
  StartStreamTranscriptionCommand,
  TranscribeStreamingClient,
} from "@aws-sdk/client-transcribe-streaming";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const awsRegion = process.env.AWS_REGION;
  const awsID = process.env.IDENTITY_POOL_ID;

  if (!awsID || !awsRegion) {
    return NextResponse.json(
      {
        status: 404,
        type: "validation",
        message: "",
        data: null,
      },
      { status: 400 }
    );
  }

  const client = new TranscribeStreamingClient({
    region: awsRegion,
    credentials: fromCognitoIdentityPool({
      client: new CognitoIdentityClient({ region: awsRegion }),
      identityPoolId: awsID,
    }),
  });

  if (!request.body) {
    return new Response("no body", { status: 400 });
  }

  // 브라우저 → 서버 Audio PCM Stream
  const browserStream = request.body;

  async function* audioGen() {
    const reader = browserStream.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      yield { AudioEvent: { AudioChunk: value } };
    }
  }

  const command = new StartStreamTranscriptionCommand({
    LanguageCode: "ko-KR",
    MediaEncoding: "pcm",
    MediaSampleRateHertz: 16000,
    AudioStream: audioGen(),
  });

  const response = await client.send(command);

  const encoder = new TextEncoder();

  // AWS → 브라우저 텍스트 스트링 반환
  const stream = new ReadableStream({
    async start(controller) {
      for await (const event of response.TranscriptResultStream || []) {
        const text =
          event.TranscriptEvent?.Transcript?.Results?.[0]?.Alternatives?.[0]
            ?.Transcript;

        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain" },
  });
}
