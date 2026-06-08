import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as api from "@/lib/client";
import type {
  ChatSession,
  Citation,
  Role,
  StudyMode,
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
  expandedSubjectIds: string[];

  activeSubjectId: string | null;
  activeSessionId: string | null;
  messages: ChatUIMessage[];
  messagesLoading: boolean;

  activeMode: StudyMode;
  isStreaming: boolean;
  abort: AbortController | null;

  setBuddyName: (name: string) => void;
  setActiveMode: (mode: StudyMode) => void;

  loadSubjects: () => Promise<void>;
  toggleSubject: (id: string) => Promise<void>;
  loadSessions: (subjectId: string) => Promise<void>;

  newSession: (subjectId: string) => Promise<void>;
  selectSession: (subjectId: string, sessionId: string) => Promise<void>;
  renameSession: (subjectId: string, sessionId: string, title: string) => Promise<void>;
  deleteSession: (subjectId: string, sessionId: string) => Promise<void>;

  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;

  activeSubject: () => Subject | null;
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set, get) => ({
      buddyName: "Buddy",
      subjects: [],
      subjectsLoaded: false,
      sessionsBySubject: {},
      expandedSubjectIds: [],
      activeSubjectId: null,
      activeSessionId: null,
      messages: [],
      messagesLoading: false,
      activeMode: "chat",
      isStreaming: false,
      abort: null,

      setBuddyName: (buddyName) => set({ buddyName }),
      setActiveMode: (activeMode) => set({ activeMode }),

      loadSubjects: async () => {
        const subjects = await api.listSubjects(false);
        set({ subjects, subjectsLoaded: true });
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
      },

      loadSessions: async (subjectId) => {
        const sessions = await api.listSessions(subjectId);
        set((s) => ({ sessionsBySubject: { ...s.sessionsBySubject, [subjectId]: sessions } }));
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
          messages: [],
          activeMode: "chat",
        }));
      },

      selectSession: async (subjectId, sessionId) => {
        set({
          activeSubjectId: subjectId,
          activeSessionId: sessionId,
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
    }),
    {
      name: "study-buddy",
      partialize: (s) => ({ buddyName: s.buddyName }),
    },
  ),
);
