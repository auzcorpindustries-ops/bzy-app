import { z } from 'zod';

export const updateSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  office_hours: z.string().optional(),
  timezone: z.string().optional(),
  deposit_required: z.boolean().optional(),
  deposit_type: z.enum(['flat', 'percentage']).optional(),
  deposit_amount: z.number().min(0).optional(),
  deposit_percentage: z.number().min(0).max(100).optional(),
  booking_buffer_hours: z.number().min(0).optional(),
  cancellation_policy_hours: z.number().min(0).optional(),
  payment_provider: z.enum(['stripe', 'square']).optional(),
}).strict();
