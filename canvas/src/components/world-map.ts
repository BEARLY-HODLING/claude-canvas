// ASCII World Map - Improved flight position visualization

/**
 * ASCII World Map data
 * Each row represents 10 degrees of latitude (90 to -60)
 * Each character represents ~5 degrees of longitude (-180 to 180)
 * Characters: ░ = ocean, █ = land, · = coastline
 */
export const WORLD_MAP_ROWS = [
  // 90°N - Arctic
  "░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░",
  // 80°N - Arctic/Greenland
  "░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██░░░░░░░█████░░░░░░░░░░░░░░░░░░░░",
  // 70°N - Canada/Scandinavia/Russia
  "░░░░░░░░░██████████░░░░░░░░░░░░░░░░░░████░░░░░░░░░░░░█████████████████░░░",
  // 60°N - Canada/Europe/Russia
  "░░░░░░░███████████████░░░░░░░░░░░░░░████░░░░░░█████████████████████████░░",
  // 50°N - USA/Europe/Russia
  "░░░░░░████████████████░░░░░░░░░░░░░██░░░░░░░░█████████████████████████░░░",
  // 40°N - USA/Europe/Asia
  "░░░░░░░██████████████░░░░░░░░░░░░░░░░░░░░░████████████████████████░░░░░░░",
  // 30°N - USA/N.Africa/Middle East/Asia
  "░░░░░░░░░█████████░░░░░░░░░░░░░░░░░░████████████████████████████░░░░░░░░░",
  // 20°N - Mexico/Africa/India/SE Asia
  "░░░░░░░░░░░██████░░░░░░░░░░░░░░░░░░██████████████████░░██████░░░░░░░░░░░░",
  // 10°N - C.America/Africa/India
  "░░░░░░░░░░░░░███░░░░░░░░░░░░░░░░░░░░██████████████░░░░░░░███░░░░░░░░░░░░░",
  // 0° - Equator
  "░░░░░░░░░░░░░░██░░░░░░░████░░░░░░░░░░░░███████░░░░░░░░░████████░░░░░░░░░░",
  // 10°S - S.America/Africa/Indonesia
  "░░░░░░░░░░░░░████░░░░░░█████░░░░░░░░░░░███████░░░░░░░░░░░░░░█████░░░░░░░░",
  // 20°S - S.America/Africa/Australia
  "░░░░░░░░░░░░░░████░░░░░░████░░░░░░░░░░░░░████░░░░░░░░░░░░░░█████████░░░░░",
  // 30°S - S.America/S.Africa/Australia
  "░░░░░░░░░░░░░░░███░░░░░░░░░░░░░░░░░░░░░░░██░░░░░░░░░░░░░░░░░████████░░░░░",
  // 40°S - S.America/Australia/NZ
  "░░░░░░░░░░░░░░░██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████░░░░░░░",
  // 50°S - Patagonia
  "░░░░░░░░░░░░░░░█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██░░░░░░░",
  // 60°S - Antarctica approach
  "░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░",
];

// Map dimensions
export const MAP_WIDTH = 72; // characters
export const MAP_HEIGHT = 16; // rows

/**
 * Major airports with their coordinates for reference
 */
export const MAJOR_AIRPORTS: Array<{
  code: string;
  name: string;
  lat: number;
  lon: number;
}> = [
  // North America
  { code: "JFK", name: "New York", lat: 40.6, lon: -73.8 },
  { code: "LAX", name: "Los Angeles", lat: 33.9, lon: -118.4 },
  { code: "ORD", name: "Chicago", lat: 41.9, lon: -87.9 },
  { code: "SFO", name: "San Francisco", lat: 37.6, lon: -122.4 },
  { code: "ATL", name: "Atlanta", lat: 33.6, lon: -84.4 },
  { code: "DFW", name: "Dallas", lat: 32.9, lon: -97.0 },
  { code: "MIA", name: "Miami", lat: 25.8, lon: -80.3 },
  { code: "SEA", name: "Seattle", lat: 47.4, lon: -122.3 },
  { code: "YYZ", name: "Toronto", lat: 43.7, lon: -79.6 },
  // Europe
  { code: "LHR", name: "London", lat: 51.5, lon: -0.5 },
  { code: "CDG", name: "Paris", lat: 49.0, lon: 2.5 },
  { code: "FRA", name: "Frankfurt", lat: 50.0, lon: 8.6 },
  { code: "AMS", name: "Amsterdam", lat: 52.3, lon: 4.8 },
  { code: "MAD", name: "Madrid", lat: 40.5, lon: -3.6 },
  { code: "FCO", name: "Rome", lat: 41.8, lon: 12.2 },
  // Asia
  { code: "NRT", name: "Tokyo", lat: 35.8, lon: 140.4 },
  { code: "HND", name: "Tokyo Haneda", lat: 35.5, lon: 139.8 },
  { code: "PEK", name: "Beijing", lat: 40.1, lon: 116.6 },
  { code: "PVG", name: "Shanghai", lat: 31.1, lon: 121.8 },
  { code: "HKG", name: "Hong Kong", lat: 22.3, lon: 113.9 },
  { code: "SIN", name: "Singapore", lat: 1.4, lon: 104.0 },
  { code: "ICN", name: "Seoul", lat: 37.5, lon: 126.5 },
  { code: "DEL", name: "Delhi", lat: 28.6, lon: 77.1 },
  { code: "DXB", name: "Dubai", lat: 25.3, lon: 55.4 },
  // Oceania
  { code: "SYD", name: "Sydney", lat: -33.9, lon: 151.2 },
  { code: "MEL", name: "Melbourne", lat: -37.7, lon: 144.8 },
  // South America
  { code: "GRU", name: "São Paulo", lat: -23.4, lon: -46.5 },
  { code: "EZE", name: "Buenos Aires", lat: -34.8, lon: -58.5 },
  // Africa
  { code: "JNB", name: "Johannesburg", lat: -26.1, lon: 28.2 },
  { code: "CAI", name: "Cairo", lat: 30.1, lon: 31.4 },
];

/**
 * Convert lat/lon to map coordinates
 */
export function latLonToMapCoords(
  lat: number,
  lon: number,
): { x: number; y: number } | null {
  // Map covers lat 90 to -70 (160 degrees) and lon -180 to 180 (360 degrees)
  // Each row = 10 degrees lat, each char = 5 degrees lon

  if (lat > 90 || lat < -70 || lon < -180 || lon > 180) {
    return null;
  }

  const y = Math.floor((90 - lat) / 10);
  const x = Math.floor((lon + 180) / 5);

  if (y < 0 || y >= MAP_HEIGHT || x < 0 || x >= MAP_WIDTH) {
    return null;
  }

  return { x, y };
}

/**
 * Get map character at coordinates
 */
export function getMapChar(x: number, y: number): string {
  if (y < 0 || y >= WORLD_MAP_ROWS.length) return "░";
  const row = WORLD_MAP_ROWS[y];
  if (!row || x < 0 || x >= row.length) return "░";
  return row[x] || "░";
}

/**
 * Generate ASCII map centered on a position
 */
export function generateCenteredMap(
  centerLat: number,
  centerLon: number,
  width: number,
  height: number,
  flights?: Array<{
    lat: number;
    lon: number;
    heading?: number;
    callsign?: string;
  }>,
  showAirports?: boolean,
): string[][] {
  const grid: string[][] = [];

  // Calculate visible lat/lon range
  // Roughly 3 degrees per character height, 5 degrees per character width
  const latPerChar = 160 / MAP_HEIGHT; // ~10 degrees
  const lonPerChar = 360 / MAP_WIDTH; // ~5 degrees

  const latRange = height * latPerChar * 0.5;
  const lonRange = width * lonPerChar * 0.5;

  const latMin = centerLat - latRange / 2;
  const latMax = centerLat + latRange / 2;
  const lonMin = centerLon - lonRange / 2;
  const lonMax = centerLon + lonRange / 2;

  // Build grid from world map
  for (let row = 0; row < height; row++) {
    const gridRow: string[] = [];
    const lat = latMax - (row / height) * (latMax - latMin);

    for (let col = 0; col < width; col++) {
      let lon = lonMin + (col / width) * (lonMax - lonMin);
      // Wrap longitude
      while (lon > 180) lon -= 360;
      while (lon < -180) lon += 360;

      const coords = latLonToMapCoords(lat, lon);
      if (coords) {
        gridRow.push(getMapChar(coords.x, coords.y));
      } else {
        gridRow.push("░");
      }
    }
    grid.push(gridRow);
  }

  // Plot airports if requested
  if (showAirports) {
    for (const airport of MAJOR_AIRPORTS) {
      if (
        airport.lat >= latMin &&
        airport.lat <= latMax &&
        airport.lon >= lonMin &&
        airport.lon <= lonMax
      ) {
        const y = Math.floor(
          ((latMax - airport.lat) / (latMax - latMin)) * height,
        );
        const x = Math.floor(
          ((airport.lon - lonMin) / (lonMax - lonMin)) * width,
        );
        if (y >= 0 && y < height && x >= 0 && x < width && grid[y]) {
          grid[y]![x] = "◉"; // Airport marker
        }
      }
    }
  }

  // Plot flights
  if (flights) {
    for (const flight of flights) {
      if (
        flight.lat >= latMin &&
        flight.lat <= latMax &&
        flight.lon >= lonMin &&
        flight.lon <= lonMax
      ) {
        const y = Math.floor(
          ((latMax - flight.lat) / (latMax - latMin)) * height,
        );
        const x = Math.floor(
          ((flight.lon - lonMin) / (lonMax - lonMin)) * width,
        );
        if (y >= 0 && y < height && x >= 0 && x < width && grid[y]) {
          // Direction arrow based on heading
          const heading = flight.heading || 0;
          let arrow = "✈";
          if (heading >= 337.5 || heading < 22.5) arrow = "↑";
          else if (heading >= 22.5 && heading < 67.5) arrow = "↗";
          else if (heading >= 67.5 && heading < 112.5) arrow = "→";
          else if (heading >= 112.5 && heading < 157.5) arrow = "↘";
          else if (heading >= 157.5 && heading < 202.5) arrow = "↓";
          else if (heading >= 202.5 && heading < 247.5) arrow = "↙";
          else if (heading >= 247.5 && heading < 292.5) arrow = "←";
          else arrow = "↖";

          grid[y]![x] = arrow;
        }
      }
    }
  }

  return grid;
}

/**
 * Get flight direction arrow based on heading
 */
export function getDirectionArrow(heading: number): string {
  if (heading >= 337.5 || heading < 22.5) return "↑";
  if (heading >= 22.5 && heading < 67.5) return "↗";
  if (heading >= 67.5 && heading < 112.5) return "→";
  if (heading >= 112.5 && heading < 157.5) return "↘";
  if (heading >= 157.5 && heading < 202.5) return "↓";
  if (heading >= 202.5 && heading < 247.5) return "↙";
  if (heading >= 247.5 && heading < 292.5) return "←";
  return "↖";
}

/**
 * Find nearest airport to coordinates
 */
export function findNearestAirport(
  lat: number,
  lon: number,
): { code: string; name: string; distance: number } | null {
  let nearest = null;
  let minDist = Infinity;

  for (const airport of MAJOR_AIRPORTS) {
    // Simple distance calc (not geodesic, but good enough for display)
    const dLat = airport.lat - lat;
    const dLon = airport.lon - lon;
    const dist = Math.sqrt(dLat * dLat + dLon * dLon);

    if (dist < minDist) {
      minDist = dist;
      nearest = { code: airport.code, name: airport.name, distance: dist };
    }
  }

  return nearest;
}
