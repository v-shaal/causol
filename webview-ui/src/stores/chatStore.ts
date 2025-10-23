/**
 * Zustand store for chat state management
 */

import { create } from 'zustand';
import { ChatState, ChatMessage, WorkflowState } from '../types/chat.types';

interface ChatStore extends ChatState {
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateWorkflowState: (updates: Partial<WorkflowState>) => void;
  setProcessing: (isProcessing: boolean) => void;
  setCurrentAgent: (agent: string | undefined) => void;
  clearMessages: () => void;
  reset: () => void;
}

const initialState: ChatState = {
  messages: [
    {
      id: 'welcome',
      role: 'system',
      type: 'text',
      content:
        'Welcome to the Causal Inference Assistant! I can help you with rigorous causal analysis. Tell me about your research question or upload your dataset to get started.',
      timestamp: Date.now(),
    },
  ],
  workflowState: {
    currentStage: 'idle',
    datasetLoaded: false,
  },
  isProcessing: false,
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: `msg-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
        },
      ],
    })),

  updateWorkflowState: (updates) =>
    set((state) => ({
      workflowState: {
        ...state.workflowState,
        ...updates,
      },
    })),

  setProcessing: (isProcessing) => set({ isProcessing }),

  setCurrentAgent: (currentAgent) => set({ currentAgent }),

  clearMessages: () =>
    set({
      messages: initialState.messages,
    }),

  reset: () => set(initialState),
}));
