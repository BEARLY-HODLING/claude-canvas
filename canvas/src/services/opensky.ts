// OpenSky Network API Client
// Documentation: https://openskynetwork.github.io/opensky-api/rest.html

const OPENSKY_BASE_URL = "https://opensky-network.org/api";

/**
 * State vector from OpenSky API
 * Each state vector represents the state of an aircraft at a specific time
 */
export interface StateVector {
  icao24: string; // Unique ICAO 24-bit address (hex string)
  callsign: string | null; // Callsign (8 chars), can be null
  originCountry: string; // Country of origin
  timePosition: number | null; // Unix timestamp of last position update
  lastContact: number; // Unix timestamp of last contact
  longitude: number | null; // WGS-84 longitude in degrees
  latitude: number | null; // WGS-84 latitude in degrees
  baroAltitude: number | null; // Barometric altitude in meters
  onGround: boolean; // True if aircraft is on ground
  velocity: number | null; // Ground speed in m/s
  trueTrack: number | null; // True track (heading) in degrees clockwise from north
  verticalRate: number | null; // Vertical rate in m/s (positive = climbing)
  sensors: number[] | null; // IDs of sensors contributing to this state vector
  geoAltitude: number | null; // Geometric altitude in meters
  squawk: string | null; // Transponder code
  spi: boolean; // Special purpose indicator
  positionSource: number; // 0=ADS-B, 1=ASTERIX, 2=MLAT, 3=FLARM
}

/**
 * Response from /states/all endpoint
 */
export interface StatesResponse {
  time: number; // Unix timestamp of API response
  states: StateVector[]; // Array of state vectors
}

/**
 * Bounding box for geographic queries
 */
export interface BoundingBox {
  lamin: number; // Lower latitude bound
  lamax: number; // Upper latitude bound
  lomin: number; // Lower longitude bound
  lomax: number; // Upper longitude bound
}

/**
 * Parse raw API response array into StateVector object
 */
function parseStateVector(raw: unknown[]): StateVector {
  return {
    icao24: raw[0] as string,
    callsign: raw[1] ? (raw[1] as string).trim() : null,
    originCountry: raw[2] as string,
    timePosition: raw[3] as number | null,
    lastContact: raw[4] as number,
    longitude: raw[5] as number | null,
    latitude: raw[6] as number | null,
    baroAltitude: raw[7] as number | null,
    onGround: raw[8] as boolean,
    velocity: raw[9] as number | null,
    trueTrack: raw[10] as number | null,
    verticalRate: raw[11] as number | null,
    sensors: raw[12] as number[] | null,
    geoAltitude: raw[13] as number | null,
    squawk: raw[14] as string | null,
    spi: raw[15] as boolean,
    positionSource: raw[16] as number,
  };
}

/**
 * OpenSky API Client
 */
export class OpenSkyClient {
  private baseUrl: string;
  private username?: string;
  private password?: string;

  constructor(options?: { username?: string; password?: string }) {
    this.baseUrl = OPENSKY_BASE_URL;
    this.username = options?.username;
    this.password = options?.password;
  }

  /**
   * Build fetch options with optional auth
   */
  private getFetchOptions(): RequestInit {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (this.username && this.password) {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString(
        "base64",
      );
      headers["Authorization"] = `Basic ${auth}`;
    }

    return { headers };
  }

  /**
   * Get all aircraft state vectors
   * Rate limit: ~10 requests per 10 seconds (anonymous)
   */
  async getAllStates(options?: {
    time?: number; // Unix timestamp, default is current time
    icao24?: string[]; // Filter by ICAO24 addresses
    bounds?: BoundingBox; // Geographic bounding box
  }): Promise<StatesResponse> {
    const params = new URLSearchParams();

    if (options?.time) {
      params.set("time", options.time.toString());
    }

    if (options?.icao24 && options.icao24.length > 0) {
      options.icao24.forEach((icao) =>
        params.append("icao24", icao.toLowerCase()),
      );
    }

    if (options?.bounds) {
      params.set("lamin", options.bounds.lamin.toString());
      params.set("lamax", options.bounds.lamax.toString());
      params.set("lomin", options.bounds.lomin.toString());
      params.set("lomax", options.bounds.lomax.toString());
    }

    const url = `${this.baseUrl}/states/all${params.toString() ? `?${params}` : ""}`;
    const response = await fetch(url, this.getFetchOptions());

    if (!response.ok) {
      throw new Error(
        `OpenSky API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return {
      time: data.time,
      states: (data.states || []).map(parseStateVector),
    };
  }

  /**
   * Search for flights by callsign (e.g., "UAL123", "DAL456")
   * Note: Callsigns are padded to 8 characters in the API
   */
  async searchByCallsign(callsign: string): Promise<StateVector[]> {
    const response = await this.getAllStates();
    const searchTerm = callsign.toUpperCase().trim();

    return response.states.filter((state) => {
      if (!state.callsign) return false;
      return state.callsign.toUpperCase().includes(searchTerm);
    });
  }

  /**
   * Get state vector for specific aircraft by ICAO24 address
   */
  async getAircraftState(icao24: string): Promise<StateVector | null> {
    const response = await this.getAllStates({ icao24: [icao24] });
    return response.states[0] || null;
  }

  /**
   * Get flights in a geographic area
   */
  async getFlightsInArea(bounds: BoundingBox): Promise<StateVector[]> {
    const response = await this.getAllStates({ bounds });
    return response.states;
  }

  /**
   * Get flights near a specific location
   */
  async getFlightsNear(
    lat: number,
    lon: number,
    radiusDegrees: number = 2,
  ): Promise<StateVector[]> {
    return this.getFlightsInArea({
      lamin: lat - radiusDegrees,
      lamax: lat + radiusDegrees,
      lomin: lon - radiusDegrees,
      lomax: lon + radiusDegrees,
    });
  }

  /**
   * Get flights in a bounding box (convenience method)
   */
  async getStatesInBoundingBox(
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number,
  ): Promise<StateVector[]> {
    return this.getFlightsInArea({
      lamin: minLat,
      lamax: maxLat,
      lomin: minLon,
      lomax: maxLon,
    });
  }
}

// Default client instance
export const opensky = new OpenSkyClient();

// Utility functions

/**
 * Convert meters to feet
 */
export function metersToFeet(meters: number | null): number | null {
  return meters !== null ? Math.round(meters * 3.28084) : null;
}

/**
 * Convert m/s to knots
 */
export function msToKnots(ms: number | null): number | null {
  return ms !== null ? Math.round(ms * 1.94384) : null;
}

/**
 * Convert m/s to mph
 */
export function msToMph(ms: number | null): number | null {
  return ms !== null ? Math.round(ms * 2.23694) : null;
}

/**
 * Format heading as cardinal direction
 */
export function headingToCardinal(heading: number | null): string {
  if (heading === null) return "N/A";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(heading / 45) % 8;
  return directions[index] || "N";
}

/**
 * Get airline name from callsign prefix
 * Common ICAO airline codes
 */
const AIRLINE_CODES: Record<string, string> = {
  AAL: "American Airlines",
  UAL: "United Airlines",
  DAL: "Delta Air Lines",
  SWA: "Southwest Airlines",
  JBU: "JetBlue Airways",
  ASA: "Alaska Airlines",
  FFT: "Frontier Airlines",
  NKS: "Spirit Airlines",
  BAW: "British Airways",
  DLH: "Lufthansa",
  AFR: "Air France",
  KLM: "KLM Royal Dutch",
  UAE: "Emirates",
  QTR: "Qatar Airways",
  SIA: "Singapore Airlines",
  CPA: "Cathay Pacific",
  ANA: "All Nippon Airways",
  JAL: "Japan Airlines",
  QFA: "Qantas",
  ACA: "Air Canada",
};

export function getAirlineName(callsign: string | null): string | null {
  if (!callsign) return null;
  const prefix = callsign.substring(0, 3).toUpperCase();
  return AIRLINE_CODES[prefix] || null;
}

/**
 * Extract flight number from callsign
 * e.g., "UAL123" -> "UA123", "DAL456" -> "DL456"
 */
export function formatFlightNumber(callsign: string | null): string {
  if (!callsign) return "Unknown";
  // Remove trailing spaces and convert to readable format
  const trimmed = callsign.trim();
  // Most callsigns are ICAO code (3 letters) + flight number
  if (trimmed.length >= 4) {
    const icaoCode = trimmed.substring(0, 3);
    const number = trimmed.substring(3);
    // Convert ICAO to IATA-like for display
    const iataMap: Record<string, string> = {
      AAL: "AA",
      UAL: "UA",
      DAL: "DL",
      SWA: "WN",
      JBU: "B6",
      ASA: "AS",
      FFT: "F9",
      NKS: "NK",
      BAW: "BA",
      DLH: "LH",
      AFR: "AF",
      KLM: "KL",
      UAE: "EK",
      QTR: "QR",
      SIA: "SQ",
      CPA: "CX",
      ANA: "NH",
      JAL: "JL",
      QFA: "QF",
      ACA: "AC",
    };
    const iata = iataMap[icaoCode] || icaoCode;
    return `${iata}${number}`;
  }
  return trimmed;
}
