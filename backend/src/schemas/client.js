import { z } from 'zod';

export const clientRegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
}).strict();

export const clientLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
}).strict();

export const clientUpdateMeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
}).strict().partial();

export const clientCreateBookingSchema = z.object({
  business_id: z.string().uuid(),
  service_id: z.string().uuid(),
  start_time: z.string().datetime(),
  notes: z.string().max(1000).optional().default(''),
}).strict();

export const businessSearchSchema = z.object({
  q: z.string().optional(),
  industry: z.enum(['hair_salon', 'nail_salon', 'tattoo']).optional(),
}).partial();

export const availabilityQueryClientSchema = z.object({
  service_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
