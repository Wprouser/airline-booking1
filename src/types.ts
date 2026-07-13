export type TravelClass = "economy" | "premium_economy" | "business" | "first";

export const TRAVEL_CLASS_LABELS: Record<TravelClass, string> = {
  economy: "Economy",
  premium_economy: "Premium Economy",
  business: "Business",
  first: "First",
};

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export interface FlightResult {
  id: string;
  flightNumber: string;
  airlineCode: string;
  airlineName: string;
  originCode: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  aircraft: string;
  fare: { price: number; availableSeats: number };
}

export interface SeatMapResponse {
  travelClass: TravelClass;
  seats: { seatNumber: string; isBooked: boolean }[];
}

export type LegType = "outbound" | "return";

export interface SelectedLeg {
  legType: LegType;
  flight: FlightResult;
  travelClass: TravelClass;
}

export interface AddonInput {
  addonType: "meal" | "baggage";
  description: string;
  price: number;
}

export interface PassengerDraft {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  passportNumber: string;
  nationality: string;
  specialMeal: string;
  seatPreference: string;
  seatsByLeg: string[];
  addons: AddonInput[];
}

export interface PaymentDraft {
  method: string;
  cardNumber: string;
  nameOnCard: string;
  expiry: string;
  cvv: string;
}

export interface BookingLeg {
  id: number;
  legType: LegType;
  flightId: string;
  travelClass: TravelClass;
  airlineName: string;
  flightNumber: string;
  originCode: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  farePrice: number;
}

export interface BookingPassenger {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  passportNumber: string | null;
  nationality: string | null;
  specialMeal: string | null;
  seatPreference: string | null;
  seats: { bookingLegId: number; seatNumber: string }[];
  addons: AddonInput[];
}

export interface BookingDetail {
  id: string;
  status: "confirmed" | "cancelled";
  tripType: "one_way" | "round_trip";
  contactEmail: string;
  contactPhone: string;
  totalAmount: number;
  createdAt: string;
  cancelledAt: string | null;
  legs: BookingLeg[];
  passengers: BookingPassenger[];
  payment: {
    method: string;
    cardLast4: string;
    status: "success" | "failed";
    transactionRef: string;
    amount: number;
  } | null;
}

export interface BookingSummary {
  id: string;
  status: "confirmed" | "cancelled";
  tripType: "one_way" | "round_trip";
  totalAmount: number;
  createdAt: string;
  cancelledAt: string | null;
  firstLegOrigin: string;
  firstLegDestination: string;
  firstLegDeparture: string;
  lastLegDeparture: string;
  passengerCount: number;
}
