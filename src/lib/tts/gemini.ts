import { config } from "@/lib/config";
import type { SynthesisResult, TtsProvider } from "./provider";
import { pcmToWav, rateFromMime } from "./wav";

interface GeminiPart {
  inlineData?: { data: string; mimeType: string };
}

/**
 * Optional higher-quality voice via Google Gemini TTS. Only used when
 * TTS_PROVIDER=gemini and GEMINI_API_KEY is set. Returns playable WAV audio.
 */
export class GeminiTtsProvider implements TtsProvider {
  readonly name = "gemini";

  async synthesize(text: string): Promise<SynthesisResult> {
    const { geminiApiKey, geminiModel, geminiVoice } = config.tts;
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not set.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: geminiVoice },
            },
          },
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini TTS failed (HTTP ${res.status}).`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: GeminiPart[] } }[];
    };
    const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part?.inlineData) {
      throw new Error("Gemini returned no audio.");
    }

    const pcm = Buffer.from(part.inlineData.data, "base64");
    const wav = pcmToWav(pcm, rateFromMime(part.inlineData.mimeType));
    return { audioBase64: wav.toString("base64"), mimeType: "audio/wav" };
  }
}
