export interface SynthesisResult {
  /** Base64-encoded audio payload. */
  audioBase64: string;
  mimeType: string;
}

/** Server-side text-to-speech contract. Browser TTS bypasses this entirely. */
export interface TtsProvider {
  readonly name: string;
  synthesize(text: string): Promise<SynthesisResult>;
}
