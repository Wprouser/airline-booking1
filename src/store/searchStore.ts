import { create } from "zustand";
import { apiFetch } from "../utils/api";
import type { Airport, FlightResult, TravelClass } from "../types";

export interface SearchCriteria {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string; // empty string = one-way
  passengers: number;
  travelClass: TravelClass;
}

interface SearchState {
  airports: Airport[];
  criteria: SearchCriteria | null;
  outbound: FlightResult[];
  returnFlights: FlightResult[];
  loading: boolean;
  error: string | null;
  loadAirports: () => Promise<void>;
  search: (criteria: SearchCriteria) => Promise<void>;
}

export const useSearchStore = create<SearchState>()((set) => ({
  airports: [],
  criteria: null,
  outbound: [],
  returnFlights: [],
  loading: false,
  error: null,

  loadAirports: async () => {
    const airports = await apiFetch<Airport[]>("/api/airports");
    set({ airports });
  },

  search: async (criteria) => {
    set({ loading: true, error: null, criteria });
    try {
      const params = new URLSearchParams({
        origin: criteria.origin,
        destination: criteria.destination,
        departureDate: criteria.departureDate,
        passengers: String(criteria.passengers),
        travelClass: criteria.travelClass,
      });
      if (criteria.returnDate) params.set("returnDate", criteria.returnDate);

      const result = await apiFetch<{ outbound: FlightResult[]; return?: FlightResult[] }>(
        `/api/flights/search?${params.toString()}`,
      );
      set({ outbound: result.outbound, returnFlights: result.return ?? [], loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Search failed" });
      throw err;
    }
  },
}));
