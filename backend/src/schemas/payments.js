import { z } from 'zod';

export const createDepositSchema = z.object({
  booking_id: z.string().uuid(),
}).strict();
