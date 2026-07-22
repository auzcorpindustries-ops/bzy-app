import { api } from '../client';
import type { CreateDepositRequest, CreateDepositResponse, RefundResponse } from '@/types/api';

export const paymentsApi = {
  /** Create a payment intent (Stripe) or payment token (Square) for a booking deposit. */
  async createDeposit(body: CreateDepositRequest): Promise<CreateDepositResponse> {
    const { data } = await api.post<CreateDepositResponse>('/api/payments/deposit', body);
    return data;
  },

  async refund(paymentId: string): Promise<RefundResponse> {
    const { data } = await api.post<RefundResponse>(`/api/payments/${paymentId}/refund`);
    return data;
  },
};
