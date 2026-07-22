import { z } from 'zod';

export const aiAgentSettingsSchema = z.object({
  voice: z.string().optional(),
  greeting: z.string().optional(),
  hours: z.string().optional(),
}).strict().partial();
