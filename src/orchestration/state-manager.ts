/**
 * State Manager using Zustand
 * Global state management for the extension
 */

import { create } from 'zustand';
import { WorkflowState, WorkflowStage } from '../types/workflow.types';
import { ExtensionConfig } from '../types/config.types';

interface AppState {
  // Workflow state
  currentWorkflow: WorkflowState | null;
  isWorkflowRunning: boolean;

  // UI state
  isChatVisible: boolean;
  isLoading: boolean;
  currentMessage: string;

  // Configuration
  config: ExtensionConfig | null;

  // Jupyter state
  isJupyterConnected: boolean;
  activeNotebookUri: string | null;

  // Actions
  setCurrentWorkflow: (workflow: WorkflowState | null) => void;
  setWorkflowRunning: (isRunning: boolean) => void;
  setChatVisible: (isVisible: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setCurrentMessage: (message: string) => void;
  setConfig: (config: ExtensionConfig) => void;
  setJupyterConnected: (isConnected: boolean) => void;
  setActiveNotebookUri: (uri: string | null) => void;
  updateWorkflowStage: (stage: WorkflowStage, status: 'pending' | 'in_progress' | 'completed' | 'failed') => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  currentWorkflow: null,
  isWorkflowRunning: false,
  isChatVisible: true,
  isLoading: false,
  currentMessage: '',
  config: null,
  isJupyterConnected: false,
  activeNotebookUri: null,

  // Actions
  setCurrentWorkflow: (workflow) => set({ currentWorkflow: workflow }),

  setWorkflowRunning: (isRunning) => set({ isWorkflowRunning: isRunning }),

  setChatVisible: (isVisible) => set({ isChatVisible: isVisible }),

  setLoading: (isLoading) => set({ isLoading: isLoading }),

  setCurrentMessage: (message) => set({ currentMessage: message }),

  setConfig: (config) => set({ config }),

  setJupyterConnected: (isConnected) => set({ isJupyterConnected: isConnected }),

  setActiveNotebookUri: (uri) => set({ activeNotebookUri: uri }),

  updateWorkflowStage: (stage, status) => set((state) => {
    if (!state.currentWorkflow) {
      return state;
    }

    const updatedWorkflow = {
      ...state.currentWorkflow,
      stages: {
        ...state.currentWorkflow.stages,
        [stage]: {
          ...state.currentWorkflow.stages[stage],
          status,
        },
      },
      updatedAt: new Date(),
    };

    return { currentWorkflow: updatedWorkflow };
  }),
}));
