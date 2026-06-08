import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as api from "@/lib/client";
import type {
  ArtifactMode,
  ChatSession,
  Citation,
  Role,
  StudyMode,
  StudyArtifact,
  Subject,
} from "@/lib/types";

export interface ChatUIMessage {
  id?: string;
  role: Role;
  content: string;
  citations?: Citation[] | null;
}

interface StudyState {
  buddyName: string;

  subjects: Subject[];
  subjectsLoaded: boolean;
  sessionsBySubject: Record<string, ChatSession[]>;
  artifactsBySubject: Record<string, StudyArtifact[]>;
  expandedSubjectIds: string[];
  sidebarSearch: string;

  activeSubjectId: string | null;
  activeSessionId: string | null;
  activeArtifactId: string | null;
  messages: ChatUIMessage[];
  messagesLoading: boolean;

  activeMode: StudyMode;
  isStreaming: boolean;
  abort: AbortController | null;

  setBuddyName: (name: string) => void;
  setActiveMode: (mode: StudyMode) => void;
  setSidebarSearch: (query: string) => void;

  loadSubjects: () => Promise<void>;
  toggleSubject: (id: string) => Promise<void>;
  loadSessions: (subjectId: string) => Promise<void>;
  loadArtifacts: (subjectId: string) => Promise<void>;

  newSession: (subjectId: string) => Promise<void>;
  selectSession: (subjectId: string, sessionId: string) => Promise<void>;
  renameSession: (subjectId: string, sessionId: string, title: string) => Promise<void>;
  deleteSession: (subjectId: string, sessionId: string) => Promise<void>;
  selectArtifact: (subjectId: string, artifactId: string) => void;
  saveArtifact: (input: {
    subjectId: string;
    mode: ArtifactMode;
    title: string;
    topic?: string | null;
    payload: unknown;
  }) => Promise<StudyArtifact>;
  deleteArtifact: (subjectId: string, artifactId: string) => Promise<void>;

  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;

  activeSubject: () => Subject | null;
  activeArtifact: () => StudyArtifact | null;
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set, get) => ({
      buddyName: "Buddy",
      subjects: [],
      subjectsLoaded: false,
      sessionsBySubject: {},
      artifactsBySubject: {},
      expandedSubjectIds: [],
      sidebarSearch: "",
      activeSubjectId: null,
      activeSessionId: null,
      activeArtifactId: null,
      messages: [],
      messagesLoading: false,
      activeMode: "chat",
      isStreaming: false,
      abort: null,

      setBuddyName: (buddyName) => set({ buddyName }),
      setActiveMode: (activeMode) => set({ activeMode }),
      setSidebarSearch: (sidebarSearch) => set({ sidebarSearch }),

      loadSubjects: async () => {
        const subjects = await api.listSubjects(false);
        set({ subjects, subjectsLoaded: true });
        await Promise.all(
          subjects.map(async (subject) => {
            const [sessions, artifacts] = await Promise.all([
              api.listSessions(subject.id),
              api.listArtifacts(subject.id),
            ]);
            set((s) => ({
              sessionsBySubject: {
                ...s.sessionsBySubject,
                [subject.id]: sessions,
              },
              artifactsBySubject: {
                ...s.artifactsBySubject,
                [subject.id]: artifacts,
              },
            }));
          }),
        );
      },

      toggleSubject: async (id) => {
        const { expandedSubjectIds } = get();
        const isOpen = expandedSubjectIds.includes(id);
        set({
          expandedSubjectIds: isOpen
            ? expandedSubjectIds.filter((s) => s !== id)
            : [...expandedSubjectIds, id],
        });
        if (!isOpen && !get().sessionsBySubject[id]) {
          await get().loadSessions(id);
        }
        if (!isOpen && !get().artifactsBySubject[id]) {
          await get().loadArtifacts(id);
        }
      },

      loadSessions: async (subjectId) => {
        const sessions = await api.listSessions(subjectId);
        set((s) => ({ sessionsBySubject: { ...s.sessionsBySubject, [subjectId]: sessions } }));
      },

      loadArtifacts: async (subjectId) => {
        const artifacts = await api.listArtifacts(subjectId);
        set((s) => ({
          artifactsBySubject: { ...s.artifactsBySubject, [subjectId]: artifacts },
        }));
      },

      newSession: async (subjectId) => {
        const session = await api.createSession(subjectId);
        set((s) => ({
          sessionsBySubject: {
            ...s.sessionsBySubject,
            [subjectId]: [session, ...(s.sessionsBySubject[subjectId] ?? [])],
          },
          expandedSubjectIds: s.expandedSubjectIds.includes(subjectId)
            ? s.expandedSubjectIds
            : [...s.expandedSubjectIds, subjectId],
          activeSubjectId: subjectId,
          activeSessionId: session.id,
          activeArtifactId: null,
          messages: [],
          activeMode: "chat",
        }));
      },

      selectSession: async (subjectId, sessionId) => {
        set({
          activeSubjectId: subjectId,
          activeSessionId: sessionId,
          activeArtifactId: null,
          messages: [],
          messagesLoading: true,
          activeMode: "chat",
        });
        try {
          const stored = await api.listMessages(sessionId);
          set({
            messages: stored.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              citations: m.citations,
            })),
          });
        } finally {
          set({ messagesLoading: false });
        }
      },

      renameSession: async (subjectId, sessionId, title) => {
        await api.renameSession(sessionId, title);
        set((s) => ({
          sessionsBySubject: {
            ...s.sessionsBySubject,
            [subjectId]: (s.sessionsBySubject[subjectId] ?? []).map((sess) =>
              sess.id === sessionId ? { ...sess, title } : sess,
            ),
          },
        }));
      },

      deleteSession: async (subjectId, sessionId) => {
        await api.deleteSession(sessionId);
        set((s) => ({
          sessionsBySubject: {
            ...s.sessionsBySubject,
            [subjectId]: (s.sessionsBySubject[subjectId] ?? []).filter((x) => x.id !== sessionId),
          },
          activeSessionId: s.activeSessionId === sessionId ? null : s.activeSessionId,
          messages: s.activeSessionId === sessionId ? [] : s.messages,
        }));
      },

      selectArtifact: (subjectId, artifactId) => {
        const artifact = get().artifactsBySubject[subjectId]?.find((a) => a.id === artifactId);
        if (!artifact) return;
        set({
          activeSubjectId: subjectId,
          activeSessionId: null,
          activeArtifactId: artifactId,
          activeMode: artifact.mode,
        });
      },

      saveArtifact: async (input) => {
        const artifact = await api.createArtifact(input);
        set((s) => ({
          artifactsBySubject: {
            ...s.artifactsBySubject,
            [input.subjectId]: [
              artifact,
              ...(s.artifactsBySubject[input.subjectId] ?? []),
            ],
          },
          expandedSubjectIds: s.expandedSubjectIds.includes(input.subjectId)
            ? s.expandedSubjectIds
            : [...s.expandedSubjectIds, input.subjectId],
          activeSubjectId: input.subjectId,
          activeSessionId: null,
          activeArtifactId: artifact.id,
          activeMode: artifact.mode,
        }));
        return artifact;
      },

      deleteArtifact: async (subjectId, artifactId) => {
        await api.deleteArtifact(artifactId);
        set((s) => ({
          artifactsBySubject: {
            ...s.artifactsBySubject,
            [subjectId]: (s.artifactsBySubject[subjectId] ?? []).filter(
              (a) => a.id !== artifactId,
            ),
          },
          activeArtifactId:
            s.activeArtifactId === artifactId ? null : s.activeArtifactId,
        }));
      },

      sendMessage: async (content) => {
        const { activeSessionId, activeSubjectId, isStreaming } = get();
        if (!activeSessionId || isStreaming || !content.trim()) return;

        const controller = new AbortController();
        set((s) => ({
          isStreaming: true,
          abort: controller,
          messages: [
            ...s.messages,
            { role: "user", content },
            { role: "assistant", content: "", citations: null },
          ],
        }));

        const patchAssistant = (fn: (m: ChatUIMessage) => ChatUIMessage) =>
          set((s) => {
            const messages = [...s.messages];
            const i = messages.length - 1;
            if (i >= 0 && messages[i].role === "assistant") messages[i] = fn(messages[i]);
            return { messages };
          });

        try {
          await api.streamChat(
            { sessionId: activeSessionId, content, signal: controller.signal },
            {
              onMeta: (citations) => patchAssistant((m) => ({ ...m, citations })),
              onDelta: (text) => patchAssistant((m) => ({ ...m, content: m.content + text })),
              onError: (message) =>
                patchAssistant((m) => ({ ...m, content: m.content || `⚠️ ${message}` })),
            },
          );
          // Refresh session list to reflect auto-title + ordering.
          if (activeSubjectId) await get().loadSessions(activeSubjectId);
        } catch (err) {
          if (!controller.signal.aborted) {
            const msg = err instanceof Error ? err.message : "Something went wrong.";
            patchAssistant((m) => ({ ...m, content: m.content || `⚠️ ${msg}` }));
          } else {
            patchAssistant((m) => ({ ...m, content: m.content + "\n\n_(stopped)_" }));
          }
        } finally {
          set({ isStreaming: false, abort: null });
        }
      },

      stopStreaming: () => get().abort?.abort(),

      activeSubject: () => {
        const { subjects, activeSubjectId } = get();
        return subjects.find((s) => s.id === activeSubjectId) ?? null;
      },

      activeArtifact: () => {
        const { activeSubjectId, activeArtifactId, artifactsBySubject } = get();
        if (!activeSubjectId || !activeArtifactId) return null;
        return (
          artifactsBySubject[activeSubjectId]?.find((a) => a.id === activeArtifactId) ??
          null
        );
      },
    }),
    {
      name: "study-buddy",
      partialize: (s) => ({ buddyName: s.buddyName }),
    },
  ),
);
