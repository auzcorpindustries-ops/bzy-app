import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  business_name: z.string().min(1).max(100),
  owner_name: z.string().min(1).max(100),
  owner_phone: z.string().min(10),
  industry: z.enum(['hair_salon', 'nail_salon', 'tattoo']),
  timezone: z.string().default('America/Chicago'),
  payment_provider: z.enum(['stripe', 'square']),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});
