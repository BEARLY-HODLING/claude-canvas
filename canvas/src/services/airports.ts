// Airport data for route search and display
// Common airports with IATA codes, names, and coordinates

export interface Airport {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

// Major airports database (top 100+ airports worldwide)
export const AIRPORTS: Record<string, Airport> = {
  // United States - Major Hubs
  ATL: {
    iata: "ATL",
    icao: "KATL",
    name: "Hartsfield-Jackson Atlanta International",
    city: "Atlanta",
    country: "US",
    latitude: 33.6407,
    longitude: -84.4277,
    timezone: "America/New_York",
  },
  LAX: {
    iata: "LAX",
    icao: "KLAX",
    name: "Los Angeles International",
    city: "Los Angeles",
    country: "US",
    latitude: 33.9425,
    longitude: -118.408,
    timezone: "America/Los_Angeles",
  },
  ORD: {
    iata: "ORD",
    icao: "KORD",
    name: "O'Hare International",
    city: "Chicago",
    country: "US",
    latitude: 41.9742,
    longitude: -87.9073,
    timezone: "America/Chicago",
  },
  DFW: {
    iata: "DFW",
    icao: "KDFW",
    name: "Dallas/Fort Worth International",
    city: "Dallas",
    country: "US",
    latitude: 32.8998,
    longitude: -97.0403,
    timezone: "America/Chicago",
  },
  DEN: {
    iata: "DEN",
    icao: "KDEN",
    name: "Denver International",
    city: "Denver",
    country: "US",
    latitude: 39.8561,
    longitude: -104.6737,
    timezone: "America/Denver",
  },
  JFK: {
    iata: "JFK",
    icao: "KJFK",
    name: "John F. Kennedy International",
    city: "New York",
    country: "US",
    latitude: 40.6413,
    longitude: -73.7781,
    timezone: "America/New_York",
  },
  SFO: {
    iata: "SFO",
    icao: "KSFO",
    name: "San Francisco International",
    city: "San Francisco",
    country: "US",
    latitude: 37.6213,
    longitude: -122.379,
    timezone: "America/Los_Angeles",
  },
  SEA: {
    iata: "SEA",
    icao: "KSEA",
    name: "Seattle-Tacoma International",
    city: "Seattle",
    country: "US",
    latitude: 47.4502,
    longitude: -122.3088,
    timezone: "America/Los_Angeles",
  },
  LAS: {
    iata: "LAS",
    icao: "KLAS",
    name: "Harry Reid International",
    city: "Las Vegas",
    country: "US",
    latitude: 36.086,
    longitude: -115.1537,
    timezone: "America/Los_Angeles",
  },
  MCO: {
    iata: "MCO",
    icao: "KMCO",
    name: "Orlando International",
    city: "Orlando",
    country: "US",
    latitude: 28.4312,
    longitude: -81.308,
    timezone: "America/New_York",
  },
  EWR: {
    iata: "EWR",
    icao: "KEWR",
    name: "Newark Liberty International",
    city: "Newark",
    country: "US",
    latitude: 40.6895,
    longitude: -74.1745,
    timezone: "America/New_York",
  },
  MIA: {
    iata: "MIA",
    icao: "KMIA",
    name: "Miami International",
    city: "Miami",
    country: "US",
    latitude: 25.7959,
    longitude: -80.287,
    timezone: "America/New_York",
  },
  PHX: {
    iata: "PHX",
    icao: "KPHX",
    name: "Phoenix Sky Harbor International",
    city: "Phoenix",
    country: "US",
    latitude: 33.4373,
    longitude: -112.0078,
    timezone: "America/Phoenix",
  },
  IAH: {
    iata: "IAH",
    icao: "KIAH",
    name: "George Bush Intercontinental",
    city: "Houston",
    country: "US",
    latitude: 29.9902,
    longitude: -95.3368,
    timezone: "America/Chicago",
  },
  BOS: {
    iata: "BOS",
    icao: "KBOS",
    name: "Boston Logan International",
    city: "Boston",
    country: "US",
    latitude: 42.3656,
    longitude: -71.0096,
    timezone: "America/New_York",
  },
  MSP: {
    iata: "MSP",
    icao: "KMSP",
    name: "Minneapolis-Saint Paul International",
    city: "Minneapolis",
    country: "US",
    latitude: 44.8848,
    longitude: -93.2223,
    timezone: "America/Chicago",
  },
  DTW: {
    iata: "DTW",
    icao: "KDTW",
    name: "Detroit Metropolitan",
    city: "Detroit",
    country: "US",
    latitude: 42.2162,
    longitude: -83.3554,
    timezone: "America/Detroit",
  },
  PHL: {
    iata: "PHL",
    icao: "KPHL",
    name: "Philadelphia International",
    city: "Philadelphia",
    country: "US",
    latitude: 39.8744,
    longitude: -75.2424,
    timezone: "America/New_York",
  },
  LGA: {
    iata: "LGA",
    icao: "KLGA",
    name: "LaGuardia",
    city: "New York",
    country: "US",
    latitude: 40.7769,
    longitude: -73.874,
    timezone: "America/New_York",
  },
  BWI: {
    iata: "BWI",
    icao: "KBWI",
    name: "Baltimore/Washington International",
    city: "Baltimore",
    country: "US",
    latitude: 39.1774,
    longitude: -76.6684,
    timezone: "America/New_York",
  },
  DCA: {
    iata: "DCA",
    icao: "KDCA",
    name: "Ronald Reagan Washington National",
    city: "Washington",
    country: "US",
    latitude: 38.8512,
    longitude: -77.0402,
    timezone: "America/New_York",
  },
  IAD: {
    iata: "IAD",
    icao: "KIAD",
    name: "Washington Dulles International",
    city: "Washington",
    country: "US",
    latitude: 38.9531,
    longitude: -77.4565,
    timezone: "America/New_York",
  },
  SAN: {
    iata: "SAN",
    icao: "KSAN",
    name: "San Diego International",
    city: "San Diego",
    country: "US",
    latitude: 32.7336,
    longitude: -117.1897,
    timezone: "America/Los_Angeles",
  },
  TPA: {
    iata: "TPA",
    icao: "KTPA",
    name: "Tampa International",
    city: "Tampa",
    country: "US",
    latitude: 27.9756,
    longitude: -82.5333,
    timezone: "America/New_York",
  },
  PDX: {
    iata: "PDX",
    icao: "KPDX",
    name: "Portland International",
    city: "Portland",
    country: "US",
    latitude: 45.5898,
    longitude: -122.5951,
    timezone: "America/Los_Angeles",
  },
  HNL: {
    iata: "HNL",
    icao: "PHNL",
    name: "Daniel K. Inouye International",
    city: "Honolulu",
    country: "US",
    latitude: 21.3187,
    longitude: -157.9225,
    timezone: "Pacific/Honolulu",
  },
  AUS: {
    iata: "AUS",
    icao: "KAUS",
    name: "Austin-Bergstrom International",
    city: "Austin",
    country: "US",
    latitude: 30.1975,
    longitude: -97.6664,
    timezone: "America/Chicago",
  },
  SLC: {
    iata: "SLC",
    icao: "KSLC",
    name: "Salt Lake City International",
    city: "Salt Lake City",
    country: "US",
    latitude: 40.7899,
    longitude: -111.9791,
    timezone: "America/Denver",
  },

  // Europe
  LHR: {
    iata: "LHR",
    icao: "EGLL",
    name: "London Heathrow",
    city: "London",
    country: "UK",
    latitude: 51.47,
    longitude: -0.4543,
    timezone: "Europe/London",
  },
  CDG: {
    iata: "CDG",
    icao: "LFPG",
    name: "Charles de Gaulle",
    city: "Paris",
    country: "FR",
    latitude: 49.0097,
    longitude: 2.5479,
    timezone: "Europe/Paris",
  },
  AMS: {
    iata: "AMS",
    icao: "EHAM",
    name: "Amsterdam Schiphol",
    city: "Amsterdam",
    country: "NL",
    latitude: 52.3105,
    longitude: 4.7683,
    timezone: "Europe/Amsterdam",
  },
  FRA: {
    iata: "FRA",
    icao: "EDDF",
    name: "Frankfurt Airport",
    city: "Frankfurt",
    country: "DE",
    latitude: 50.0379,
    longitude: 8.5622,
    timezone: "Europe/Berlin",
  },
  MAD: {
    iata: "MAD",
    icao: "LEMD",
    name: "Adolfo Suárez Madrid-Barajas",
    city: "Madrid",
    country: "ES",
    latitude: 40.4983,
    longitude: -3.5676,
    timezone: "Europe/Madrid",
  },
  BCN: {
    iata: "BCN",
    icao: "LEBL",
    name: "Barcelona-El Prat",
    city: "Barcelona",
    country: "ES",
    latitude: 41.2974,
    longitude: 2.0833,
    timezone: "Europe/Madrid",
  },
  FCO: {
    iata: "FCO",
    icao: "LIRF",
    name: "Leonardo da Vinci-Fiumicino",
    city: "Rome",
    country: "IT",
    latitude: 41.8003,
    longitude: 12.2389,
    timezone: "Europe/Rome",
  },
  MUC: {
    iata: "MUC",
    icao: "EDDM",
    name: "Munich Airport",
    city: "Munich",
    country: "DE",
    latitude: 48.3537,
    longitude: 11.775,
    timezone: "Europe/Berlin",
  },
  ZRH: {
    iata: "ZRH",
    icao: "LSZH",
    name: "Zurich Airport",
    city: "Zurich",
    country: "CH",
    latitude: 47.4647,
    longitude: 8.5492,
    timezone: "Europe/Zurich",
  },
  LGW: {
    iata: "LGW",
    icao: "EGKK",
    name: "London Gatwick",
    city: "London",
    country: "UK",
    latitude: 51.1537,
    longitude: -0.1821,
    timezone: "Europe/London",
  },
  DUB: {
    iata: "DUB",
    icao: "EIDW",
    name: "Dublin Airport",
    city: "Dublin",
    country: "IE",
    latitude: 53.4264,
    longitude: -6.2499,
    timezone: "Europe/Dublin",
  },
  VIE: {
    iata: "VIE",
    icao: "LOWW",
    name: "Vienna International",
    city: "Vienna",
    country: "AT",
    latitude: 48.1103,
    longitude: 16.5697,
    timezone: "Europe/Vienna",
  },
  CPH: {
    iata: "CPH",
    icao: "EKCH",
    name: "Copenhagen Airport",
    city: "Copenhagen",
    country: "DK",
    latitude: 55.618,
    longitude: 12.656,
    timezone: "Europe/Copenhagen",
  },
  OSL: {
    iata: "OSL",
    icao: "ENGM",
    name: "Oslo Gardermoen",
    city: "Oslo",
    country: "NO",
    latitude: 60.1939,
    longitude: 11.1004,
    timezone: "Europe/Oslo",
  },
  ARN: {
    iata: "ARN",
    icao: "ESSA",
    name: "Stockholm Arlanda",
    city: "Stockholm",
    country: "SE",
    latitude: 59.6498,
    longitude: 17.9238,
    timezone: "Europe/Stockholm",
  },
  HEL: {
    iata: "HEL",
    icao: "EFHK",
    name: "Helsinki-Vantaa",
    city: "Helsinki",
    country: "FI",
    latitude: 60.3172,
    longitude: 24.9633,
    timezone: "Europe/Helsinki",
  },
  LIS: {
    iata: "LIS",
    icao: "LPPT",
    name: "Lisbon Portela",
    city: "Lisbon",
    country: "PT",
    latitude: 38.7756,
    longitude: -9.1354,
    timezone: "Europe/Lisbon",
  },
  BRU: {
    iata: "BRU",
    icao: "EBBR",
    name: "Brussels Airport",
    city: "Brussels",
    country: "BE",
    latitude: 50.9014,
    longitude: 4.4844,
    timezone: "Europe/Brussels",
  },

  // Asia
  HND: {
    iata: "HND",
    icao: "RJTT",
    name: "Tokyo Haneda",
    city: "Tokyo",
    country: "JP",
    latitude: 35.5494,
    longitude: 139.7798,
    timezone: "Asia/Tokyo",
  },
  NRT: {
    iata: "NRT",
    icao: "RJAA",
    name: "Narita International",
    city: "Tokyo",
    country: "JP",
    latitude: 35.7647,
    longitude: 140.3864,
    timezone: "Asia/Tokyo",
  },
  PEK: {
    iata: "PEK",
    icao: "ZBAA",
    name: "Beijing Capital International",
    city: "Beijing",
    country: "CN",
    latitude: 40.0799,
    longitude: 116.6031,
    timezone: "Asia/Shanghai",
  },
  PVG: {
    iata: "PVG",
    icao: "ZSPD",
    name: "Shanghai Pudong International",
    city: "Shanghai",
    country: "CN",
    latitude: 31.1443,
    longitude: 121.8083,
    timezone: "Asia/Shanghai",
  },
  HKG: {
    iata: "HKG",
    icao: "VHHH",
    name: "Hong Kong International",
    city: "Hong Kong",
    country: "HK",
    latitude: 22.308,
    longitude: 113.9185,
    timezone: "Asia/Hong_Kong",
  },
  SIN: {
    iata: "SIN",
    icao: "WSSS",
    name: "Singapore Changi",
    city: "Singapore",
    country: "SG",
    latitude: 1.3644,
    longitude: 103.9915,
    timezone: "Asia/Singapore",
  },
  ICN: {
    iata: "ICN",
    icao: "RKSI",
    name: "Incheon International",
    city: "Seoul",
    country: "KR",
    latitude: 37.4602,
    longitude: 126.4407,
    timezone: "Asia/Seoul",
  },
  BKK: {
    iata: "BKK",
    icao: "VTBS",
    name: "Suvarnabhumi",
    city: "Bangkok",
    country: "TH",
    latitude: 13.6811,
    longitude: 100.7472,
    timezone: "Asia/Bangkok",
  },
  KUL: {
    iata: "KUL",
    icao: "WMKK",
    name: "Kuala Lumpur International",
    city: "Kuala Lumpur",
    country: "MY",
    latitude: 2.7456,
    longitude: 101.7099,
    timezone: "Asia/Kuala_Lumpur",
  },
  DEL: {
    iata: "DEL",
    icao: "VIDP",
    name: "Indira Gandhi International",
    city: "Delhi",
    country: "IN",
    latitude: 28.5562,
    longitude: 77.1,
    timezone: "Asia/Kolkata",
  },
  BOM: {
    iata: "BOM",
    icao: "VABB",
    name: "Chhatrapati Shivaji Maharaj International",
    city: "Mumbai",
    country: "IN",
    latitude: 19.0896,
    longitude: 72.8656,
    timezone: "Asia/Kolkata",
  },
  DXB: {
    iata: "DXB",
    icao: "OMDB",
    name: "Dubai International",
    city: "Dubai",
    country: "AE",
    latitude: 25.2528,
    longitude: 55.3644,
    timezone: "Asia/Dubai",
  },
  DOH: {
    iata: "DOH",
    icao: "OTHH",
    name: "Hamad International",
    city: "Doha",
    country: "QA",
    latitude: 25.2732,
    longitude: 51.6081,
    timezone: "Asia/Qatar",
  },
  AUH: {
    iata: "AUH",
    icao: "OMAA",
    name: "Abu Dhabi International",
    city: "Abu Dhabi",
    country: "AE",
    latitude: 24.433,
    longitude: 54.6511,
    timezone: "Asia/Dubai",
  },
  TPE: {
    iata: "TPE",
    icao: "RCTP",
    name: "Taiwan Taoyuan International",
    city: "Taipei",
    country: "TW",
    latitude: 25.0777,
    longitude: 121.2328,
    timezone: "Asia/Taipei",
  },
  MNL: {
    iata: "MNL",
    icao: "RPLL",
    name: "Ninoy Aquino International",
    city: "Manila",
    country: "PH",
    latitude: 14.5086,
    longitude: 121.0198,
    timezone: "Asia/Manila",
  },
  CGK: {
    iata: "CGK",
    icao: "WIII",
    name: "Soekarno-Hatta International",
    city: "Jakarta",
    country: "ID",
    latitude: -6.1256,
    longitude: 106.6558,
    timezone: "Asia/Jakarta",
  },

  // Oceania
  SYD: {
    iata: "SYD",
    icao: "YSSY",
    name: "Sydney Kingsford Smith",
    city: "Sydney",
    country: "AU",
    latitude: -33.9399,
    longitude: 151.1753,
    timezone: "Australia/Sydney",
  },
  MEL: {
    iata: "MEL",
    icao: "YMML",
    name: "Melbourne Airport",
    city: "Melbourne",
    country: "AU",
    latitude: -37.6733,
    longitude: 144.8433,
    timezone: "Australia/Melbourne",
  },
  BNE: {
    iata: "BNE",
    icao: "YBBN",
    name: "Brisbane Airport",
    city: "Brisbane",
    country: "AU",
    latitude: -27.3942,
    longitude: 153.1218,
    timezone: "Australia/Brisbane",
  },
  AKL: {
    iata: "AKL",
    icao: "NZAA",
    name: "Auckland Airport",
    city: "Auckland",
    country: "NZ",
    latitude: -37.0082,
    longitude: 174.7917,
    timezone: "Pacific/Auckland",
  },

  // Canada
  YYZ: {
    iata: "YYZ",
    icao: "CYYZ",
    name: "Toronto Pearson International",
    city: "Toronto",
    country: "CA",
    latitude: 43.6777,
    longitude: -79.6248,
    timezone: "America/Toronto",
  },
  YVR: {
    iata: "YVR",
    icao: "CYVR",
    name: "Vancouver International",
    city: "Vancouver",
    country: "CA",
    latitude: 49.1947,
    longitude: -123.1789,
    timezone: "America/Vancouver",
  },
  YUL: {
    iata: "YUL",
    icao: "CYUL",
    name: "Montréal-Trudeau International",
    city: "Montreal",
    country: "CA",
    latitude: 45.4706,
    longitude: -73.7408,
    timezone: "America/Toronto",
  },
  YYC: {
    iata: "YYC",
    icao: "CYYC",
    name: "Calgary International",
    city: "Calgary",
    country: "CA",
    latitude: 51.1315,
    longitude: -114.0103,
    timezone: "America/Edmonton",
  },

  // Latin America
  MEX: {
    iata: "MEX",
    icao: "MMMX",
    name: "Mexico City International",
    city: "Mexico City",
    country: "MX",
    latitude: 19.4363,
    longitude: -99.0721,
    timezone: "America/Mexico_City",
  },
  GRU: {
    iata: "GRU",
    icao: "SBGR",
    name: "São Paulo-Guarulhos International",
    city: "São Paulo",
    country: "BR",
    latitude: -23.4356,
    longitude: -46.4731,
    timezone: "America/Sao_Paulo",
  },
  GIG: {
    iata: "GIG",
    icao: "SBGL",
    name: "Rio de Janeiro-Galeão International",
    city: "Rio de Janeiro",
    country: "BR",
    latitude: -22.8099,
    longitude: -43.2506,
    timezone: "America/Sao_Paulo",
  },
  SCL: {
    iata: "SCL",
    icao: "SCEL",
    name: "Arturo Merino Benítez International",
    city: "Santiago",
    country: "CL",
    latitude: -33.393,
    longitude: -70.7858,
    timezone: "America/Santiago",
  },
  EZE: {
    iata: "EZE",
    icao: "SAEZ",
    name: "Ministro Pistarini International",
    city: "Buenos Aires",
    country: "AR",
    latitude: -34.8222,
    longitude: -58.5358,
    timezone: "America/Argentina/Buenos_Aires",
  },
  BOG: {
    iata: "BOG",
    icao: "SKBO",
    name: "El Dorado International",
    city: "Bogotá",
    country: "CO",
    latitude: 4.7016,
    longitude: -74.1469,
    timezone: "America/Bogota",
  },
  LIM: {
    iata: "LIM",
    icao: "SPJC",
    name: "Jorge Chávez International",
    city: "Lima",
    country: "PE",
    latitude: -12.0219,
    longitude: -77.1143,
    timezone: "America/Lima",
  },
  CUN: {
    iata: "CUN",
    icao: "MMUN",
    name: "Cancún International",
    city: "Cancún",
    country: "MX",
    latitude: 21.0365,
    longitude: -86.8771,
    timezone: "America/Cancun",
  },

  // Africa & Middle East
  JNB: {
    iata: "JNB",
    icao: "FAOR",
    name: "O.R. Tambo International",
    city: "Johannesburg",
    country: "ZA",
    latitude: -26.1392,
    longitude: 28.246,
    timezone: "Africa/Johannesburg",
  },
  CAI: {
    iata: "CAI",
    icao: "HECA",
    name: "Cairo International",
    city: "Cairo",
    country: "EG",
    latitude: 30.1219,
    longitude: 31.4056,
    timezone: "Africa/Cairo",
  },
  TLV: {
    iata: "TLV",
    icao: "LLBG",
    name: "Ben Gurion",
    city: "Tel Aviv",
    country: "IL",
    latitude: 32.0055,
    longitude: 34.8854,
    timezone: "Asia/Jerusalem",
  },
  IST: {
    iata: "IST",
    icao: "LTFM",
    name: "Istanbul Airport",
    city: "Istanbul",
    country: "TR",
    latitude: 41.2753,
    longitude: 28.7519,
    timezone: "Europe/Istanbul",
  },
};

/**
 * Look up airport by IATA code
 */
export function getAirport(iataCode: string): Airport | null {
  return AIRPORTS[iataCode.toUpperCase()] || null;
}

/**
 * Search airports by name, city, or code
 */
export function searchAirports(query: string): Airport[] {
  const q = query.toLowerCase();
  return Object.values(AIRPORTS).filter(
    (airport) =>
      airport.iata.toLowerCase().includes(q) ||
      airport.icao.toLowerCase().includes(q) ||
      airport.name.toLowerCase().includes(q) ||
      airport.city.toLowerCase().includes(q),
  );
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate bearing between two coordinates
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Check if a flight is likely on a route between two airports
 * Based on position being within corridor between airports
 */
export function isOnRoute(
  flightLat: number,
  flightLon: number,
  origin: Airport,
  destination: Airport,
  corridorWidthKm: number = 100,
): boolean {
  // Calculate total route distance
  const routeDistance = calculateDistance(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude,
  );

  // Calculate distances to each airport
  const distToOrigin = calculateDistance(
    flightLat,
    flightLon,
    origin.latitude,
    origin.longitude,
  );
  const distToDest = calculateDistance(
    flightLat,
    flightLon,
    destination.latitude,
    destination.longitude,
  );

  // Flight should be along the route (sum of distances ~ route distance)
  const totalDist = distToOrigin + distToDest;
  const deviation = totalDist - routeDistance;

  // Allow for some deviation (corridor width converted to km equivalent)
  return deviation < corridorWidthKm;
}

/**
 * Get nearest airport to a coordinate
 */
export function getNearestAirport(lat: number, lon: number): Airport | null {
  let nearest: Airport | null = null;
  let minDistance = Infinity;

  for (const airport of Object.values(AIRPORTS)) {
    const distance = calculateDistance(
      lat,
      lon,
      airport.latitude,
      airport.longitude,
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = airport;
    }
  }

  return nearest;
}

/**
 * Get airports within a radius of a coordinate
 */
export function getAirportsNear(
  lat: number,
  lon: number,
  radiusKm: number,
): Airport[] {
  return Object.values(AIRPORTS).filter((airport) => {
    const distance = calculateDistance(
      lat,
      lon,
      airport.latitude,
      airport.longitude,
    );
    return distance <= radiusKm;
  });
}
