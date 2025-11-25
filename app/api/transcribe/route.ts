import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import {
  StartStreamTranscriptionCommand,
  TranscribeStreamingClient,
  AudioStream,
} from "@aws-sdk/client-transcribe-streaming";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { WebSocketServer } from "ws";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

let wss: WebSocketServer | null = null;

class AudioQueue {
  private queue: Buffer[] = [];
  private resolver: ((value: Buffer | undefined) => void) | null = null;

  enqueue(chunk: Buffer) {
    if (this.resolver) {
      this.resolver(chunk);
      this.resolver = null;
    } else {
      this.queue.push(chunk);
    }
  }

  async *generator(): AsyncGenerator<AudioStream> {
    while (true) {
      const chunk =
        this.queue.length > 0
          ? this.queue.shift()
          : await new Promise<Buffer | undefined>((resolve) => {
              this.resolver = resolve;
            });

      if (!chunk) break;

      yield {
        AudioEvent: {
          AudioChunk: chunk,
        },
      };
    }
  }
}

function createTranscribeClient() {
  const region = process.env.AWS_REGION;
  const poolId = process.env.IDENTITY_POOL_ID;

  if (!region || !poolId) return null;

  return new TranscribeStreamingClient({
    region,
    credentials: fromCognitoIdentityPool({
      client: new CognitoIdentityClient({ region }),
      identityPoolId: poolId,
    }),
  });
}

function startWSS() {
  if (wss) return;

  wss = new WebSocketServer({ port: 3001 });
  console.log("WS Server Started on 3001");

  wss.on("connection", async (ws) => {
    console.log("connected");

    const transcribeClient = createTranscribeClient();

    if (!transcribeClient) {
      return;
    }

    const audioQueue = new AudioQueue();

    const command = new StartStreamTranscriptionCommand({
      LanguageCode: "ko-KR",
      MediaEncoding: "pcm",
      MediaSampleRateHertz: 44100,
      AudioStream: audioQueue.generator(),
    });

    const responsePromise = transcribeClient.send(command);

    ws.on("message", (chunk: Buffer<ArrayBuffer>) => {
      audioQueue.enqueue(chunk);
    });

    (async () => {
      const response = await responsePromise;

      if (response.TranscriptResultStream) {
        try {
          for await (const event of response.TranscriptResultStream) {
            if (event.TranscriptEvent?.Transcript?.Results?.[0]) {
              const result = event.TranscriptEvent.Transcript.Results[0];
              if (result.Alternatives?.[0]?.Transcript) {
                const transcriptResult = result.Alternatives[0].Transcript;

                const isPartial = result.IsPartial;

                if (!isPartial) ws.send(transcriptResult);
              }
            }
          }
        } catch (streamError) {
          console.error("Error processing transcript stream:", streamError);

          throw streamError;
        }
      }
    })();

    ws.on("close", () => {
      console.log("disconnected");
      transcribeClient.destroy();
      audioQueue.enqueue(Buffer.alloc(0));
    });
  });
}

export function GET() {
  startWSS();
  return NextResponse.json({ message: "WebSocket STT server running" });
}
