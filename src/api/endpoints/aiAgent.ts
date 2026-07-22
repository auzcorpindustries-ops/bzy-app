import { api } from '../client';
import type { AiAgentSettingsRequest, AiAgentStatus } from '@/types/api';

export const aiAgentApi = {
  /** Enable AI agent tier — backend provisions a Twilio number. */
  async enable(): Promise<AiAgentStatus> {
    const { data } = await api.post<AiAgentStatus>('/api/ai-agent/enable');
    return data;
  },

  async disable(): Promise<AiAgentStatus> {
    const { data } = await api.post<AiAgentStatus>('/api/ai-agent/disable');
    return data;
  },

  async status(): Promise<AiAgentStatus> {
    const { data } = await api.get<AiAgentStatus>('/api/ai-agent/status');
    return data;
  },

  async updateSettings(body: AiAgentSettingsRequest): Promise<AiAgentStatus> {
    const { data } = await api.patch<AiAgentStatus>('/api/ai-agent/settings', body);
    return data;
  },
};
