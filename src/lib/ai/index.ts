import { config } from "@/lib/config";
import { OllamaProvider } from "./ollama";
import type { TextProvider } from "./provider";

let cached: TextProvider | null = null;

/** Returns the configured text provider (singleton). */
export function getTextProvider(): TextProvider {
  if (cached) return cached;
  switch (config.textProvider) {
    case "ollama":
    default:
      cached = new OllamaProvider();
  }
  return cached;
}

export type { TextProvider, ChatOptions, HealthStatus } from "./provider";
