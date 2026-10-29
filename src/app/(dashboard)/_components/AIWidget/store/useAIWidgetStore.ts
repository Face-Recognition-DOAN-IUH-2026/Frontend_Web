import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api-client';
import { createCompanionChunkHandler } from '@/lib/ai-streaming';
import type { CompanionState, VisemeData } from '@/lib/types/ai';

export interface CommandCenterSummary {
  operational_score: number;
  active_patrons: number;
  overdue_borrows: number;
  scheduled_staff_today: number;
  today_entries: number;
  today_exits: number;
  generated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isVoice?: boolean;
}

interface AIWidgetStore {
  isOpen: boolean;
  isMinimized: boolean;
  activeTab: 'score' | 'chat' | 'actions';
  lastSummary: CommandCenterSummary | null;
  messages: ChatMessage[];
  isLoadingChat: boolean;
  chatSessionId?: string;
  proactiveMessage: string | null;
  failedSearchCount: number;

  companionState: CompanionState;
  isVoiceActive: boolean;
  visemeData: VisemeData[];
  audioQueue: string[];
  currentAudio: string | null;

  open: () => void;
  close: () => void;
  toggle: () => void;
  minimize: () => void;
  setActiveTab: (tab: 'score' | 'chat' | 'actions') => void;
  updateSummary: (summary: CommandCenterSummary) => void;
  sendMessage: (message: string) => Promise<void>;
  sendVoiceMessage: (audioBase64: string) => Promise<void>;
  setCompanionState: (state: CompanionState) => void;
  setVoiceActive: (active: boolean) => void;
  setVisemeData: (visemes: VisemeData[]) => void;
  setCurrentAudio: (audio: string | null) => void;
  clearMessages: () => void;
  recordFailedSearch: () => void;
  resetFailedSearch: () => void;
  dismissProactive: () => void;
}

export const useAIWidgetStore = create<AIWidgetStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      isMinimized: false,
      activeTab: 'score',
      lastSummary: null,
      messages: [],
      isLoadingChat: false,
      chatSessionId: undefined,
      proactiveMessage: null,
      failedSearchCount: 0,

      companionState: 'idle',
      isVoiceActive: false,
      visemeData: [],
      audioQueue: [],
      currentAudio: null,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      minimize: () => set((state) => ({ isMinimized: !state.isMinimized })),

      setActiveTab: (tab) => set({ activeTab: tab }),

      updateSummary: (summary) => set({ lastSummary: summary }),

      setCompanionState: (state) => set({ companionState: state }),
      setVoiceActive: (active) => set({ isVoiceActive: active }),
      setVisemeData: (visemes) => set({ visemeData: visemes }),
      setCurrentAudio: (audio) => set({ currentAudio: audio }),

      recordFailedSearch: () => set((state) => {
        const next = state.failedSearchCount + 1;
        if (next >= 3 && !state.proactiveMessage) {
          return {
            failedSearchCount: next,
            proactiveMessage: "Bạn đang tìm sách? Tôi có thể giúp bạn tìm kiếm hoặc gợi ý sách phù hợp.",
          };
        }
        return { failedSearchCount: next };
      }),

      resetFailedSearch: () => set({ failedSearchCount: 0 }),

      dismissProactive: () => set({ proactiveMessage: null }),

      sendMessage: async (message: string) => {
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: message,
          timestamp: Date.now(),
        };

        set((state) => ({
          messages: [...state.messages, userMessage],
          isLoadingChat: true,
          companionState: 'thinking',
        }));

        try {
          const { chatSessionId } = get();

          await api.streamCompanionChat(
            message,
            undefined,
            chatSessionId,
            createCompanionChunkHandler({
              onTextChange: (content) =>
                set((state) => ({
                  messages: [
                    ...state.messages.filter((m) => m.id !== 'streaming'),
                    {
                      id: 'streaming',
                      role: 'assistant',
                      content,
                      timestamp: Date.now(),
                    },
                  ],
                })),
              onAudio: (chunk) =>
                set({ currentAudio: chunk.data.audioBase64, companionState: 'speaking' }),
              onViseme: (chunk) => set({ visemeData: chunk.data.visemes }),
              onDone: (sessionId) =>
                set((state) => ({
                  messages: state.messages.map((m) =>
                    m.id === 'streaming' ? { ...m, id: `assistant-${Date.now()}` } : m
                  ),
                  isLoadingChat: false,
                  companionState: 'idle',
                  chatSessionId: sessionId || state.chatSessionId,
                })),
            }),
            (error) => {
              console.error('Companion stream error:', error);
              set((state) => ({
                messages: [
                  ...state.messages,
                  {
                    id: `error-${Date.now()}`,
                    role: 'assistant',
                    content: 'Xin lỗi, đã xảy ra lỗi khi kết nối AI. Vui lòng thử lại.',
                    timestamp: Date.now(),
                  },
                ],
                isLoadingChat: false,
                companionState: 'error',
              }));
            },
          );
        } catch {
          const errorMessage: ChatMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: 'Xin lỗi, đã xảy ra lỗi khi kết nối AI. Vui lòng thử lại.',
            timestamp: Date.now(),
          };

          set((state) => ({
            messages: [...state.messages, errorMessage],
            isLoadingChat: false,
            companionState: 'error',
          }));
        }
      },

      sendVoiceMessage: async (audioBase64: string) => {
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: '[Voice message]',
          timestamp: Date.now(),
          isVoice: true,
        };

        set((state) => ({
          messages: [...state.messages, userMessage],
          isLoadingChat: true,
          companionState: 'listening',
        }));

        try {
          const { chatSessionId } = get();

          await api.streamCompanionChat(
            undefined,
            audioBase64,
            chatSessionId,
            createCompanionChunkHandler({
              onTextChange: (content) =>
                set((state) => ({
                  messages: [
                    ...state.messages.filter((m) => m.id !== 'streaming'),
                    {
                      id: 'streaming',
                      role: 'assistant',
                      content,
                      timestamp: Date.now(),
                    },
                  ],
                })),
              onAudio: (chunk) =>
                set({ currentAudio: chunk.data.audioBase64, companionState: 'speaking' }),
              onViseme: (chunk) => set({ visemeData: chunk.data.visemes }),
              onDone: (sessionId) =>
                set((state) => ({
                  messages: state.messages.map((m) =>
                    m.id === 'streaming' ? { ...m, id: `assistant-${Date.now()}` } : m
                  ),
                  isLoadingChat: false,
                  companionState: 'idle',
                  chatSessionId: sessionId || state.chatSessionId,
                })),
            }),
            (error) => {
              console.error('Companion stream error:', error);
              set((state) => ({
                messages: [
                  ...state.messages,
                  {
                    id: `error-${Date.now()}`,
                    role: 'assistant',
                    content: 'Xin lỗi, đã xảy ra lỗi khi kết nối AI. Vui lòng thử lại.',
                    timestamp: Date.now(),
                  },
                ],
                isLoadingChat: false,
                companionState: 'error',
              }));
            },
          );
        } catch {
          const errorMessage: ChatMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: 'Xin lỗi, đã xảy ra lỗi khi kết nối AI. Vui lòng thử lại.',
            timestamp: Date.now(),
          };

          set((state) => ({
            messages: [...state.messages, errorMessage],
            isLoadingChat: false,
            companionState: 'error',
          }));
        }
      },

      clearMessages: () => set({ messages: [], chatSessionId: undefined }),
    }),
    {
      name: 'ai-widget-storage',
      partialize: (state) => ({
        isMinimized: state.isMinimized,
        activeTab: state.activeTab,
        messages: state.messages,
        chatSessionId: state.chatSessionId,
      }),
    }
  )
);