import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  duration_minutes: z.number().int().min(5).max(480),
  price_cents: z.number().int().min(0),
  deposit_cents: z.number().int().min(0).optional().default(0),
  category: z.string().max(50).optional().default('general'),
}).strict();

export const updateServiceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  duration_minutes: z.number().int().min(5).max(480).optional(),
  price_cents: z.number().int().min(0).optional(),
  deposit_cents: z.number().int().min(0).optional(),
  category: z.string().max(50).optional(),
  active: z.boolean().optional(),
}).strict();
