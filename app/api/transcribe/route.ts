// src/app/api/transcribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  AudioStream,
} from "@aws-sdk/client-transcribe-streaming";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";

export const runtime = "nodejs";

const MAX_FRAME_SIZE = 4000;

export async function POST(request: NextRequest) {
  let client: TranscribeStreamingClient | undefined;

  const region = process.env.AWS_REGION;
  const awsID = process.env.IDENTITY_POOL_ID;

  if (!region || !awsID) {
    return NextResponse.json(
      {
        transcript: "",
        status: "validation check",
        message: "check your aws credentials",
      },
      { status: 400 }
    );
  }

  try {
    client = new TranscribeStreamingClient({
      region: process.env.NEXT_AWS_REGION,
      credentials: fromCognitoIdentityPool({
        client: new CognitoIdentityClient({ region: region }),
        identityPoolId: awsID,
      }),
      requestHandler: {
        timeoutInMs: 10000,
      },
    });

    const { audioChunk } = await request.json();
    const fullBuffer = Buffer.from(audioChunk);

    const chunks: Buffer[] = [];
    for (let i = 0; i < fullBuffer.length; i += MAX_FRAME_SIZE) {
      chunks.push(fullBuffer.slice(i, i + MAX_FRAME_SIZE));
    }

    const audioStream: AsyncIterable<AudioStream> = {
      async *[Symbol.asyncIterator]() {
        try {
          for (const chunk of chunks) {
            yield {
              AudioEvent: {
                AudioChunk: chunk,
              },
            };
          }
        } catch (err) {
          console.error("Error in audio stream generator:", err);
          throw err;
        }
      },
    };

    const command = new StartStreamTranscriptionCommand({
      LanguageCode: "ko-KR",
      MediaEncoding: "pcm",
      MediaSampleRateHertz: 44100,
      AudioStream: audioStream,
    });

    const response = await client.send(command);
    let transcriptResult = "";

    if (response.TranscriptResultStream) {
      try {
        for await (const event of response.TranscriptResultStream) {
          if (event.TranscriptEvent?.Transcript?.Results?.[0]) {
            const result = event.TranscriptEvent.Transcript.Results[0];
            if (result.Alternatives?.[0]?.Transcript) {
              transcriptResult = result.Alternatives[0].Transcript;
            }
          }
        }
      } catch (streamError) {
        console.error("Error processing transcript stream:", streamError);
        if (transcriptResult) {
          return NextResponse.json({ transcript: transcriptResult });
        }
        throw streamError;
      }
    }

    return NextResponse.json({ transcript: transcriptResult });
  } catch (error) {
    return NextResponse.json(
      {
        transcript: "",
        status: "warning",
        message: "error : " + error,
      },
      { status: 400 }
    );
  } finally {
    if (client) {
      try {
        await client.destroy();
      } catch (destroyError) {
        console.error("Error destroying client:", destroyError);
      }
    }
  }
}
