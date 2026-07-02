import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api-client';

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
}

interface AIWidgetStore {
  isOpen: boolean;
  isMinimized: boolean;
  activeTab: 'score' | 'chat' | 'actions';
  lastSummary: CommandCenterSummary | null;
  messages: ChatMessage[];
  isLoadingChat: boolean;
  chatSessionId?: string;

  open: () => void;
  close: () => void;
  toggle: () => void;
  minimize: () => void;
  setActiveTab: (tab: 'score' | 'chat' | 'actions') => void;
  updateSummary: (summary: CommandCenterSummary) => void;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
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

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      minimize: () => set((state) => ({ isMinimized: !state.isMinimized })),

      setActiveTab: (tab) => set({ activeTab: tab }),

      updateSummary: (summary) => set({ lastSummary: summary }),

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
        }));

        try {
          const { chatSessionId } = get();
          const data = await api.askAiChat(message, chatSessionId);

          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response || 'Xin lỗi, tôi không thể trả lời lúc này.',
            timestamp: Date.now(),
          };

          set((state) => ({
            messages: [...state.messages, assistantMessage],
            isLoadingChat: false,
            chatSessionId: data.sessionId || state.chatSessionId,
          }));
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
      }),
    }
  )
);