"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { Headphones, Loader2, Pause, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generatePodcast, synthesizeServerTts } from "@/lib/client";
import { useStudyStore } from "@/lib/store";
import { EmptyHint, FeatureShell, useFeatureMessages } from "./feature-shell";

type PlayState = "idle" | "loading" | "playing" | "paused";

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const prefer = [/Samantha/i, /Google US English/i, /Jenny/i, /Aria/i, /en-US/i, /en-GB/i];
  for (const re of prefer) {
    const v = voices.find((vv) => re.test(vv.name) || re.test(vv.lang));
    if (v) return v;
  }
  return voices.find((v) => v.lang?.startsWith("en"));
}

export function PodcastPanel() {
  const { activeSubjectId: subjectId, activeArtifact, saveArtifact } = useStudyStore();
  const artifact = activeArtifact();
  const buildMessages = useFeatureMessages();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState("");
  const [provider, setProvider] = useState<"browser" | "gemini">("browser");
  const [playState, setPlayState] = useState<PlayState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Warm up voice list (Chrome loads them async).
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (artifact?.mode !== "podcast") return;
    const payload = artifact.payload as {
      script?: string;
      provider?: "browser" | "gemini";
      topic?: string | null;
    };
    stop();
    setScript(payload.script ?? "");
    setProvider(payload.provider ?? "browser");
    setTopic(payload.topic ?? artifact.topic ?? "");
  }, [artifact]);

  async function generate() {
    if (!subjectId) {
      toast.error("Pick a subject first.");
      return;
    }
    const messages = buildMessages(topic);
    if (!messages) return;
    stop();
    setLoading(true);
    setScript("");
    try {
      const result = await generatePodcast({ messages, subjectId });
      setScript(result.script);
      setProvider(result.ttsProvider);
      await saveArtifact({
        subjectId,
        mode: "podcast",
        title: topic.trim() || "Generated podcast",
        topic: topic.trim() || null,
        payload: {
          script: result.script,
          provider: result.ttsProvider,
          topic: topic.trim() || null,
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate podcast");
    } finally {
      setLoading(false);
    }
  }

  function speakBrowser() {
    const synth = window.speechSynthesis;
    if (!synth) {
      toast.error("Your browser doesn't support speech synthesis.");
      return;
    }
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(script);
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    utter.rate = 1;
    utter.onend = () => setPlayState("idle");
    utter.onerror = () => setPlayState("idle");
    synth.speak(utter);
    setPlayState("playing");
  }

  async function playGemini() {
    setPlayState("loading");
    try {
      const { audioBase64, mimeType } = await synthesizeServerTts(script);
      const blob = await (await fetch(`data:${mimeType};base64,${audioBase64}`)).blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayState("idle");
      await audio.play();
      setPlayState("playing");
    } catch (err) {
      setPlayState("idle");
      toast.error(err instanceof Error ? err.message : "Audio failed");
    }
  }

  function play() {
    if (provider === "gemini") void playGemini();
    else speakBrowser();
  }

  function pause() {
    if (provider === "browser") window.speechSynthesis.pause();
    else audioRef.current?.pause();
    setPlayState("paused");
  }

  function resume() {
    if (provider === "browser") window.speechSynthesis.resume();
    else void audioRef.current?.play();
    setPlayState("playing");
  }

  function stop() {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayState("idle");
  }

  return (
    <FeatureShell
      icon="🎧"
      title="Podcast"
      description="Turn your study session into a friendly spoken summary you can listen to."
      topic={topic}
      setTopic={setTopic}
      placeholder="Optional: a topic for the episode (leave blank to use your chat)"
      onGenerate={generate}
      loading={loading}
      ctaLabel="Generate episode"
    >
      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Writing your episode…
        </div>
      )}

      {!loading && !script && (
        <EmptyHint icon={<Headphones className="size-5" />} text="Your podcast script will appear here." />
      )}

      {script && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
            {playState === "idle" && (
              <Button onClick={play} size="sm">
                <Play className="size-4" /> Play
              </Button>
            )}
            {playState === "loading" && (
              <Button size="sm" disabled>
                <Loader2 className="size-4 animate-spin" /> Loading…
              </Button>
            )}
            {playState === "playing" && (
              <Button onClick={pause} size="sm" variant="secondary">
                <Pause className="size-4" /> Pause
              </Button>
            )}
            {playState === "paused" && (
              <Button onClick={resume} size="sm">
                <Play className="size-4" /> Resume
              </Button>
            )}
            {playState !== "idle" && (
              <Button onClick={stop} size="sm" variant="ghost">
                <Square className="size-4" /> Stop
              </Button>
            )}
            <span className="ml-auto text-[11px] text-muted-foreground">
              {provider === "gemini" ? "Gemini voice" : "Browser voice · free"}
            </span>
          </div>
          <div className="rounded-xl border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {script}
          </div>
        </div>
      )}
    </FeatureShell>
  );
}
