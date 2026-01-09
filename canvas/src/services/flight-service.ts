// Flight Service - Aggregates data from OpenSky API into TrackedFlight format

import {
  opensky,
  type StateVector,
  metersToFeet,
  msToKnots,
  headingToCardinal,
  formatFlightNumber,
  getAirlineName,
} from "./opensky";
import {
  getAirport,
  isOnRoute,
  getNearestAirport,
  calculateDistance,
  type Airport,
} from "./airports";
import type { TrackedFlight } from "../canvases/flight/types";

/**
 * Convert OpenSky StateVector to TrackedFlight
 */
export function stateVectorToTrackedFlight(state: StateVector): TrackedFlight {
  const altitude = metersToFeet(state.baroAltitude);
  const speed = msToKnots(state.velocity);
  const verticalRateFtMin = state.verticalRate
    ? Math.round(state.verticalRate * 196.85) // m/s to ft/min
    : null;

  return {
    icao24: state.icao24,
    callsign: state.callsign?.trim() || state.icao24.toUpperCase(),
    flightNumber: formatFlightNumber(state.callsign),
    airline: getAirlineName(state.callsign),
    originCountry: state.originCountry,

    // Position
    latitude: state.latitude,
    longitude: state.longitude,
    altitude,
    altitudeMeters: state.baroAltitude,

    // Movement
    speed,
    speedMs: state.velocity,
    heading: state.trueTrack,
    headingCardinal: headingToCardinal(state.trueTrack),
    verticalRate: verticalRateFtMin,
    onGround: state.onGround,

    // Timestamps
    lastContact: new Date(state.lastContact * 1000),
    lastPosition: state.timePosition
      ? new Date(state.timePosition * 1000)
      : null,

    // Status
    status: state.onGround ? "ground" : state.latitude ? "airborne" : "unknown",
  };
}

/**
 * Flight Service - High-level interface for flight tracking
 */
export class FlightService {
  private refreshInterval: number;
  private lastFetch: number = 0;
  private minFetchInterval: number = 5000; // 5 seconds minimum between fetches (rate limit protection)

  constructor(options?: { refreshInterval?: number }) {
    this.refreshInterval = (options?.refreshInterval || 10) * 1000;
  }

  /**
   * Check if we should throttle the request
   */
  private shouldThrottle(): boolean {
    const now = Date.now();
    if (now - this.lastFetch < this.minFetchInterval) {
      return true;
    }
    this.lastFetch = now;
    return false;
  }

  /**
   * Search for flights by callsign or flight number
   * e.g., "UAL123", "UA123", "united"
   */
  async searchFlights(query: string): Promise<TrackedFlight[]> {
    if (this.shouldThrottle()) {
      console.warn("Rate limited - please wait before searching again");
      return [];
    }

    const states = await opensky.searchByCallsign(query);
    return states.map(stateVectorToTrackedFlight);
  }

  /**
   * Get flights near a location
   */
  async getFlightsNear(
    lat: number,
    lon: number,
    radiusDegrees: number = 2,
  ): Promise<TrackedFlight[]> {
    if (this.shouldThrottle()) {
      return [];
    }

    const states = await opensky.getFlightsNear(lat, lon, radiusDegrees);
    return states.map(stateVectorToTrackedFlight);
  }

  /**
   * Get a specific flight by ICAO24 address
   */
  async getFlightByIcao24(icao24: string): Promise<TrackedFlight | null> {
    if (this.shouldThrottle()) {
      return null;
    }

    const state = await opensky.getAircraftState(icao24);
    return state ? stateVectorToTrackedFlight(state) : null;
  }

  /**
   * Get all currently tracked flights (use sparingly - large response)
   */
  async getAllFlights(): Promise<TrackedFlight[]> {
    if (this.shouldThrottle()) {
      return [];
    }

    const response = await opensky.getAllStates();
    return response.states
      .filter((s) => s.callsign) // Only flights with callsigns
      .map(stateVectorToTrackedFlight);
  }

  /**
   * Search for flights on a specific route between two airports
   * @param origin - Origin airport code (IATA or ICAO)
   * @param destination - Destination airport code (IATA or ICAO)
   * @param toleranceDegrees - How close to the route line to search (default 2°)
   */
  async searchByRoute(
    origin: string,
    destination: string,
    toleranceDegrees: number = 2,
  ): Promise<TrackedFlight[]> {
    if (this.shouldThrottle()) {
      console.warn("Rate limited - please wait before searching again");
      return [];
    }

    const originAirport = getAirport(origin);
    const destAirport = getAirport(destination);

    if (!originAirport || !destAirport) {
      console.warn(
        `Unknown airport code: ${!originAirport ? origin : destination}`,
      );
      return [];
    }

    // Get all flights in a bounding box around the route
    const minLat =
      Math.min(originAirport.latitude, destAirport.latitude) - toleranceDegrees;
    const maxLat =
      Math.max(originAirport.latitude, destAirport.latitude) + toleranceDegrees;
    const minLon =
      Math.min(originAirport.longitude, destAirport.longitude) -
      toleranceDegrees;
    const maxLon =
      Math.max(originAirport.longitude, destAirport.longitude) +
      toleranceDegrees;

    const states = await opensky.getStatesInBoundingBox(
      minLat,
      maxLat,
      minLon,
      maxLon,
    );
    const flights = states.map(stateVectorToTrackedFlight);

    // Filter to only flights that are on the route corridor
    return flights.filter((flight) => {
      if (flight.latitude === null || flight.longitude === null) return false;
      return isOnRoute(
        flight.latitude,
        flight.longitude,
        originAirport,
        destAirport,
        toleranceDegrees,
      );
    });
  }

  /**
   * Get statistics about current global air traffic
   */
  async getStats(): Promise<{
    total: number;
    airborne: number;
    onGround: number;
    withCallsign: number;
    timestamp: Date;
  }> {
    const response = await opensky.getAllStates();
    const states = response.states;

    return {
      total: states.length,
      airborne: states.filter((s) => !s.onGround).length,
      onGround: states.filter((s) => s.onGround).length,
      withCallsign: states.filter((s) => s.callsign).length,
      timestamp: new Date(response.time * 1000),
    };
  }
}

// Default service instance
export const flightService = new FlightService();

/**
 * Format flight info for display
 */
export function formatFlightInfo(flight: TrackedFlight): string[] {
  const lines: string[] = [];

  lines.push(
    `${flight.flightNumber}${flight.airline ? ` (${flight.airline})` : ""}`,
  );
  lines.push(`Status: ${flight.status.toUpperCase()}`);

  if (flight.latitude && flight.longitude) {
    lines.push(
      `Position: ${flight.latitude.toFixed(4)}°, ${flight.longitude.toFixed(4)}°`,
    );
  }

  if (flight.altitude !== null) {
    lines.push(`Altitude: ${flight.altitude.toLocaleString()} ft`);
  }

  if (flight.speed !== null) {
    lines.push(`Speed: ${flight.speed} kts`);
  }

  if (flight.heading !== null) {
    lines.push(
      `Heading: ${flight.heading.toFixed(0)}° ${flight.headingCardinal}`,
    );
  }

  if (flight.verticalRate !== null && flight.verticalRate !== 0) {
    const direction = flight.verticalRate > 0 ? "↑" : "↓";
    lines.push(
      `Vertical: ${direction} ${Math.abs(flight.verticalRate)} ft/min`,
    );
  }

  lines.push(`Country: ${flight.originCountry}`);
  lines.push(`ICAO24: ${flight.icao24}`);

  return lines;
}

/**
 * Get status color for display
 */
export function getStatusColor(status: TrackedFlight["status"]): string {
  switch (status) {
    case "airborne":
      return "green";
    case "ground":
      return "yellow";
    default:
      return "gray";
  }
}
