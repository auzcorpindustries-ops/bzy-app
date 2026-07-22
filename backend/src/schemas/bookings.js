import { z } from 'zod';

export const createBookingSchema = z.object({
  service_id: z.string().uuid(),
  customer_name: z.string().min(1).max(200),
  customer_phone: z.string().min(10),
  customer_email: z.string().email().optional(),
  start_time: z.string().datetime(),
  notes: z.string().max(1000).optional().default(''),
}).strict();

export const updateBookingSchema = z.object({
  start_time: z.string().datetime().optional(),
  status: z.enum(['confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  notes: z.string().max(1000).optional(),
}).strict();

export const listBookingsQuerySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(['confirmed', 'cancelled', 'completed', 'no_show']).optional(),
}).partial();

export const availabilityQuerySchema = z.object({
  service_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
