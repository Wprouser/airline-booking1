export type SortKey = "price" | "duration" | "departure" | "airline";
export type StopsFilter = "all" | "nonstop" | "1stop";

export interface FlightFilterState {
  sort: SortKey;
  stops: StopsFilter;
  airlines: Set<string>;
}

export const DEFAULT_FILTER_STATE: FlightFilterState = { sort: "price", stops: "all", airlines: new Set() };

export function applyFlightFilters<
  T extends { fare: { price: number }; durationMinutes: number; departureTime: string; airlineCode: string; airlineName: string; stops: number },
>(flights: T[], state: FlightFilterState): T[] {
  let result = flights;
  if (state.stops === "nonstop") result = result.filter((f) => f.stops === 0);
  else if (state.stops === "1stop") result = result.filter((f) => f.stops === 1);
  if (state.airlines.size > 0) result = result.filter((f) => state.airlines.has(f.airlineCode));

  const sorted = [...result];
  switch (state.sort) {
    case "price":
      sorted.sort((a, b) => a.fare.price - b.fare.price);
      break;
    case "duration":
      sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
      break;
    case "departure":
      sorted.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
      break;
    case "airline":
      sorted.sort((a, b) => a.airlineName.localeCompare(b.airlineName));
      break;
  }
  return sorted;
}
