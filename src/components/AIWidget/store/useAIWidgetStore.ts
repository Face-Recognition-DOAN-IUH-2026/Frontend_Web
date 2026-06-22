import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
          });

          if (!response.ok) throw new Error('Chat request failed');

          const data = await response.json();

          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.answer || data.message || 'Xin lỗi, tôi không thể trả lời lúc này.',
            timestamp: Date.now(),
          };

          set((state) => ({
            messages: [...state.messages, assistantMessage],
            isLoadingChat: false,
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

      clearMessages: () => set({ messages: [] }),
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