import { create } from "zustand";
import { apiFetch } from "../utils/api";
import type { BookingDetail, BookingSummary } from "../types";

interface BookingsState {
  mine: BookingSummary[];
  loading: boolean;
  fetchMine: () => Promise<void>;
  fetchDetail: (id: string) => Promise<BookingDetail>;
  cancelBooking: (id: string) => Promise<void>;
}

export const useBookingsStore = create<BookingsState>()((set, get) => ({
  mine: [],
  loading: false,

  fetchMine: async () => {
    set({ loading: true });
    const mine = await apiFetch<BookingSummary[]>("/api/bookings/mine");
    set({ mine, loading: false });
  },

  fetchDetail: (id) => apiFetch<BookingDetail>(`/api/bookings/${id}`),

  cancelBooking: async (id) => {
    await apiFetch(`/api/bookings/${id}`, { method: "DELETE" });
    await get().fetchMine(); // re-fetch canonical state rather than patching locally
  },
}));
