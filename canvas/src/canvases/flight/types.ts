// Flight Canvas - Type Definitions (Booking + Tracker modes)

// =============================================================================
// TRACKER MODE TYPES (Real-time flight tracking via OpenSky)
// =============================================================================

export interface TrackedFlight {
  icao24: string; // Unique ICAO 24-bit address
  callsign: string; // Flight callsign (e.g., "UAL123")
  flightNumber: string; // Formatted flight number (e.g., "UA123")
  airline: string | null; // Airline name if recognized
  originCountry: string; // Country of aircraft registration

  // Position
  latitude: number | null;
  longitude: number | null;
  altitude: number | null; // Feet
  altitudeMeters: number | null; // Original meters value

  // Movement
  speed: number | null; // Knots
  speedMs: number | null; // Original m/s value
  heading: number | null; // Degrees
  headingCardinal: string; // N, NE, E, etc.
  verticalRate: number | null; // ft/min
  onGround: boolean;

  // Timestamps
  lastContact: Date;
  lastPosition: Date | null;

  // Status
  status: "airborne" | "ground" | "unknown";
}

export interface TrackerConfig {
  mode: "tracker";
  title?: string;
  searchQuery?: string; // Initial search query (callsign or flight number)
  refreshInterval?: number; // Auto-refresh interval in seconds (default: 10)
  trackedFlights?: TrackedFlight[]; // Pre-populated flights to display
  nearLocation?: {
    // Show flights near a location
    latitude: number;
    longitude: number;
    radiusDegrees?: number;
  };
}

export interface TrackerResult {
  selectedFlight: TrackedFlight;
  action: "view" | "track" | "close";
}

// =============================================================================
// BOOKING MODE TYPES (Original demo booking mode)
// =============================================================================

export interface Airport {
  code: string; // 3-letter code, e.g., "SFO"
  name: string; // Full name, e.g., "San Francisco International"
  city: string; // City name, e.g., "San Francisco"
  timezone: string; // Timezone abbreviation, e.g., "PST"
}

export interface Seatmap {
  rows: number; // Total rows, e.g., 30
  seatsPerRow: string[]; // Seat letters, e.g., ["A", "B", "C", "D", "E", "F"]
  aisleAfter: string[]; // Aisle positions, e.g., ["C"] means aisle after seat C
  unavailable: string[]; // Blocked seats, e.g., ["1A", "1B"]
  premium: string[]; // Premium seats (exit row, extra legroom)
  occupied: string[]; // Already booked seats
}

export interface Flight {
  id: string;
  airline: string; // e.g., "United Airlines"
  flightNumber: string; // e.g., "UA 123"
  origin: Airport;
  destination: Airport;
  departureTime: string; // ISO datetime string
  arrivalTime: string; // ISO datetime string
  duration: number; // Duration in minutes
  price: number; // Price in cents
  currency: string; // e.g., "USD"
  cabinClass: "economy" | "premium" | "business" | "first";
  aircraft?: string; // e.g., "Boeing 737-800"
  stops: number; // 0 = nonstop
  seatmap?: Seatmap; // Optional seatmap for seat selection
}

export interface FlightConfig {
  mode?: "booking" | "tracker"; // Default: "booking" for backwards compatibility
  flights?: Flight[]; // Booking mode flights
  title?: string; // Optional title for the canvas
  showSeatmap?: boolean; // Enable seat selection mode
  selectedFlightId?: string; // Pre-select a flight by ID

  // Tracker mode options (when mode === "tracker")
  searchQuery?: string; // Initial search query (callsign or flight number)
  refreshInterval?: number; // Auto-refresh interval in seconds (default: 10)
  trackedFlights?: TrackedFlight[]; // Pre-populated flights to display
  nearLocation?: {
    latitude: number;
    longitude: number;
    radiusDegrees?: number;
  };
  route?: {
    // Search flights on a specific route
    origin: string; // Origin airport code (IATA or ICAO)
    destination: string; // Destination airport code (IATA or ICAO)
    toleranceDegrees?: number; // How close to route (default: 2)
  };
}

export interface FlightResult {
  selectedFlight: Flight;
  selectedSeat?: string; // e.g., "12A"
}

// Cyberpunk color palette
export const CYBER_COLORS = {
  neonCyan: "cyan", // Primary accent, selected items
  neonMagenta: "magenta", // Secondary accent, headers
  neonGreen: "green", // Success, confirmed
  neonYellow: "yellow", // Premium seats
  neonRed: "red", // Occupied/unavailable
  dim: "gray", // Inactive/muted text
  bg: "black", // Background
} as const;

// Seat status for rendering
export type SeatStatus =
  | "available"
  | "occupied"
  | "selected"
  | "premium"
  | "unavailable";

// Focus mode for keyboard navigation
export type FocusMode = "flights" | "seatmap";

// Helper to format price
export function formatPrice(cents: number, currency: string = "USD"): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

// Helper to format duration
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Helper to format time from ISO string
export function formatTime(isoString: string, timezone?: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Helper to parse seat string into row and letter
export function parseSeat(
  seat: string,
): { row: number; letter: string } | null {
  const match = seat.match(/^(\d+)([A-Z])$/);
  if (!match || !match[1] || !match[2]) return null;
  return { row: parseInt(match[1], 10), letter: match[2] };
}

// Helper to build seat string from row and letter
export function buildSeat(row: number, letter: string): string {
  return `${row}${letter}`;
}
