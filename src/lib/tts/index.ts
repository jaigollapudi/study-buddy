import { config } from "@/lib/config";
import { GeminiTtsProvider } from "./gemini";
import type { TtsProvider } from "./provider";

/** Returns a server TTS provider, or null when audio is handled in-browser. */
export function getTtsProvider(): TtsProvider | null {
  switch (config.tts.provider) {
    case "gemini":
      return new GeminiTtsProvider();
    case "browser":
    default:
      return null;
  }
}

export type { TtsProvider, SynthesisResult } from "./provider";
