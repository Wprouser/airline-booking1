import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AddonInput, FlightResult, PassengerDraft, PaymentDraft, TravelClass } from "../types";

function blankPassenger(): PassengerDraft {
  return {
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    passportNumber: "",
    nationality: "",
    specialMeal: "",
    seatPreference: "",
    seatsByLeg: [],
    addons: [],
  };
}

interface BookingDraftState {
  tripType: "one_way" | "round_trip";
  travelClass: TravelClass;
  passengerCount: number;
  outboundFlight: FlightResult | null;
  returnFlight: FlightResult | null;
  passengers: PassengerDraft[];
  contactEmail: string;
  contactPhone: string;
  payment: PaymentDraft;

  setTripDetails: (tripType: "one_way" | "round_trip", travelClass: TravelClass, passengerCount: number) => void;
  selectOutbound: (flight: FlightResult) => void;
  selectReturn: (flight: FlightResult) => void;
  ensurePassengerCount: () => void;
  updatePassenger: (index: number, patch: Partial<PassengerDraft>) => void;
  setSeat: (passengerIndex: number, legIndex: number, seatNumber: string) => void;
  setAddons: (passengerIndex: number, addons: AddonInput[]) => void;
  setContact: (email: string, phone: string) => void;
  setPayment: (payment: PaymentDraft) => void;
  legCount: () => number;
  legsTotal: () => number;
  addonsTotal: () => number;
  grandTotal: () => number;
  reset: () => void;
}

const initialPayment: PaymentDraft = { method: "card", cardNumber: "", nameOnCard: "", expiry: "", cvv: "" };

export const useBookingDraftStore = create<BookingDraftState>()(
  persist(
    (set, get) => ({
      tripType: "one_way",
      travelClass: "economy",
      passengerCount: 1,
      outboundFlight: null,
      returnFlight: null,
      passengers: [],
      contactEmail: "",
      contactPhone: "",
      payment: initialPayment,

      setTripDetails: (tripType, travelClass, passengerCount) =>
        set({ tripType, travelClass, passengerCount, outboundFlight: null, returnFlight: null, passengers: [] }),

      selectOutbound: (flight) => set({ outboundFlight: flight }),
      selectReturn: (flight) => set({ returnFlight: flight }),

      ensurePassengerCount: () =>
        set((state) => {
          const count = state.passengerCount;
          const passengers = [...state.passengers];
          while (passengers.length < count) passengers.push(blankPassenger());
          while (passengers.length > count) passengers.pop();
          return { passengers };
        }),

      updatePassenger: (index, patch) =>
        set((state) => {
          const passengers = [...state.passengers];
          passengers[index] = { ...passengers[index], ...patch };
          return { passengers };
        }),

      setSeat: (passengerIndex, legIndex, seatNumber) =>
        set((state) => {
          const passengers = [...state.passengers];
          const seatsByLeg = [...passengers[passengerIndex].seatsByLeg];
          seatsByLeg[legIndex] = seatNumber;
          passengers[passengerIndex] = { ...passengers[passengerIndex], seatsByLeg };
          return { passengers };
        }),

      setAddons: (passengerIndex, addons) =>
        set((state) => {
          const passengers = [...state.passengers];
          passengers[passengerIndex] = { ...passengers[passengerIndex], addons };
          return { passengers };
        }),

      setContact: (contactEmail, contactPhone) => set({ contactEmail, contactPhone }),
      setPayment: (payment) => set({ payment }),

      legCount: () => (get().tripType === "round_trip" ? 2 : 1),

      legsTotal: () => {
        const state = get();
        const perPassenger = (state.outboundFlight?.fare.price ?? 0) + (state.returnFlight?.fare.price ?? 0);
        return perPassenger * state.passengers.length;
      },

      addonsTotal: () => get().passengers.reduce((sum, p) => sum + p.addons.reduce((s, a) => s + a.price, 0), 0),

      grandTotal: () => get().legsTotal() + get().addonsTotal(),

      reset: () =>
        set({
          tripType: "one_way",
          travelClass: "economy",
          passengerCount: 1,
          outboundFlight: null,
          returnFlight: null,
          passengers: [],
          contactEmail: "",
          contactPhone: "",
          payment: initialPayment,
        }),
    }),
    { name: "booking-draft", storage: createJSONStorage(() => sessionStorage) },
  ),
);
