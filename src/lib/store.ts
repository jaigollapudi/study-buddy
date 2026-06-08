import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage, SourceDocument, StudyMode } from "@/lib/types";

interface StudyState {
  buddyName: string;
  messages: ChatMessage[];
  documents: SourceDocument[];
  /** Empty array => use every document as context. */
  selectedDocIds: string[];
  activeMode: StudyMode;
  isStreaming: boolean;

  setBuddyName: (name: string) => void;
  addMessage: (msg: ChatMessage) => void;
  appendToLastAssistant: (delta: string) => void;
  replaceLastAssistant: (content: string) => void;
  clearChat: () => void;

  setDocuments: (docs: SourceDocument[]) => void;
  addDocument: (doc: SourceDocument) => void;
  removeDocument: (id: string) => void;
  toggleDocSelection: (id: string) => void;

  setActiveMode: (mode: StudyMode) => void;
  setStreaming: (streaming: boolean) => void;

  /** Doc ids to send to the API (undefined = all docs). */
  effectiveDocIds: () => string[] | undefined;
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set, get) => ({
      buddyName: "Buddy",
      messages: [],
      documents: [],
      selectedDocIds: [],
      activeMode: "chat",
      isStreaming: false,

      setBuddyName: (name) => set({ buddyName: name }),

      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

      appendToLastAssistant: (delta) =>
        set((s) => {
          const messages = [...s.messages];
          const last = messages[messages.length - 1];
          if (last && last.role === "assistant") {
            messages[messages.length - 1] = {
              ...last,
              content: last.content + delta,
            };
          }
          return { messages };
        }),

      replaceLastAssistant: (content) =>
        set((s) => {
          const messages = [...s.messages];
          const last = messages[messages.length - 1];
          if (last && last.role === "assistant") {
            messages[messages.length - 1] = { ...last, content };
          }
          return { messages };
        }),

      clearChat: () => set({ messages: [] }),

      setDocuments: (documents) =>
        set((s) => ({
          documents,
          selectedDocIds: s.selectedDocIds.filter((id) =>
            documents.some((d) => d.id === id),
          ),
        })),

      addDocument: (doc) =>
        set((s) => ({ documents: [doc, ...s.documents] })),

      removeDocument: (id) =>
        set((s) => ({
          documents: s.documents.filter((d) => d.id !== id),
          selectedDocIds: s.selectedDocIds.filter((d) => d !== id),
        })),

      toggleDocSelection: (id) =>
        set((s) => ({
          selectedDocIds: s.selectedDocIds.includes(id)
            ? s.selectedDocIds.filter((d) => d !== id)
            : [...s.selectedDocIds, id],
        })),

      setActiveMode: (activeMode) => set({ activeMode }),
      setStreaming: (isStreaming) => set({ isStreaming }),

      effectiveDocIds: () => {
        const { selectedDocIds } = get();
        return selectedDocIds.length ? selectedDocIds : undefined;
      },
    }),
    {
      name: "study-buddy",
      partialize: (s) => ({
        buddyName: s.buddyName,
        messages: s.messages,
        selectedDocIds: s.selectedDocIds,
      }),
    },
  ),
);
