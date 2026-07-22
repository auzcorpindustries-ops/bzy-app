import { create } from 'zustand';
import { aiAgentApi, settingsApi } from '@/api';
import { useAuthStore } from './authStore';
import type { AiAgentSettingsRequest, AiAgentStatus, UpdateSettingsRequest } from '@/types/api';

interface SettingsState {
  aiAgent: AiAgentStatus | null;
  isSaving: boolean;
  error: string | null;
  updateSettings: (body: UpdateSettingsRequest) => Promise<void>;
  fetchAiAgent: () => Promise<void>;
  enableAiAgent: () => Promise<void>;
  disableAiAgent: () => Promise<void>;
  updateAiAgentSettings: (body: AiAgentSettingsRequest) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  aiAgent: null,
  isSaving: false,
  error: null,

  updateSettings: async (body) => {
    set({ isSaving: true, error: null });
    try {
      const business = await settingsApi.update(body);
      useAuthStore.getState().setBusiness(business);
      set({ isSaving: false });
    } catch (e) {
      set({ error: (e as Error).message, isSaving: false });
      throw e;
    }
  },

  fetchAiAgent: async () => {
    try {
      const aiAgent = await aiAgentApi.status();
      set({ aiAgent });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  enableAiAgent: async () => {
    set({ isSaving: true, error: null });
    try {
      const aiAgent = await aiAgentApi.enable();
      set({ aiAgent, isSaving: false });
    } catch (e) {
      set({ error: (e as Error).message, isSaving: false });
      throw e;
    }
  },

  disableAiAgent: async () => {
    set({ isSaving: true, error: null });
    try {
      const aiAgent = await aiAgentApi.disable();
      set({ aiAgent, isSaving: false });
    } catch (e) {
      set({ error: (e as Error).message, isSaving: false });
      throw e;
    }
  },

  updateAiAgentSettings: async (body) => {
    set({ isSaving: true, error: null });
    try {
      const aiAgent = await aiAgentApi.updateSettings(body);
      set({ aiAgent, isSaving: false });
    } catch (e) {
      set({ error: (e as Error).message, isSaving: false });
      throw e;
    }
  },
}));
