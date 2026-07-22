import { api } from '../client';
import { tokenStorage } from '../tokenStorage';
import type {
  BusinessDetail,
  BusinessPublicProfile,
  BusinessSearchParams,
  ClientAuthResponse,
  ClientAvailabilityResponse,
  ClientBooking,
  ClientCreateBookingRequest,
  ClientLoginRequest,
  ClientRegisterRequest,
  ClientUser,
} from '@/types/client';
import type { CreateDepositResponse, RegisterPushTokenRequest } from '@/types/api';

export const clientAuthApi = {
  async register(body: ClientRegisterRequest): Promise<ClientAuthResponse> {
    const { data } = await api.post<ClientAuthResponse>('/client/auth/register', body);
    await tokenStorage.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async login(body: ClientLoginRequest): Promise<ClientAuthResponse> {
    const { data } = await api.post<ClientAuthResponse>('/client/auth/login', body);
    await tokenStorage.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async me(): Promise<ClientUser> {
    const { data } = await api.get<ClientUser>('/client/auth/me');
    return data;
  },

  async updateMe(body: Partial<Pick<ClientUser, 'name' | 'email' | 'phone'>>): Promise<ClientUser> {
    const { data } = await api.patch<ClientUser>('/client/auth/me', body);
    return data;
  },

  async logout(): Promise<void> {
    await tokenStorage.clear();
  },
};

export const clientApi = {
  async searchBusinesses(params?: BusinessSearchParams): Promise<BusinessPublicProfile[]> {
    const { data } = await api.get<{ items: BusinessPublicProfile[] }>('/client/businesses', { params });
    return data.items;
  },

  async getBusiness(businessId: string): Promise<BusinessDetail> {
    const { data } = await api.get<BusinessDetail>(`/client/businesses/${businessId}`);
    return data;
  },

  async availability(
    businessId: string,
    serviceId: string,
    date: string,
  ): Promise<ClientAvailabilityResponse> {
    const { data } = await api.get<ClientAvailabilityResponse>(
      `/client/businesses/${businessId}/availability`,
      { params: { service_id: serviceId, date } },
    );
    return data;
  },

  async myBookings(scope?: 'upcoming' | 'past'): Promise<ClientBooking[]> {
    const { data } = await api.get<{ items: ClientBooking[] }>('/client/bookings', {
      params: scope ? { scope } : undefined,
    });
    return data.items;
  },

  async getBooking(bookingId: string): Promise<ClientBooking> {
    const { data } = await api.get<ClientBooking>(`/client/bookings/${bookingId}`);
    return data;
  },

  async createBooking(body: ClientCreateBookingRequest): Promise<ClientBooking> {
    const { data } = await api.post<ClientBooking>('/client/bookings', body);
    return data;
  },

  async cancelBooking(bookingId: string): Promise<ClientBooking> {
    const { data } = await api.patch<ClientBooking>(`/client/bookings/${bookingId}`, {
      status: 'cancelled',
    });
    return data;
  },

  async createDeposit(bookingId: string): Promise<CreateDepositResponse> {
    const { data } = await api.post<CreateDepositResponse>('/client/payments/deposit', {
      booking_id: bookingId,
    });
    return data;
  },

  async registerPushToken(body: RegisterPushTokenRequest): Promise<void> {
    await api.post('/client/push/token', body);
  },
};
