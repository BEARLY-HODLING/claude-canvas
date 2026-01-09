// Weather Service - Open-Meteo API integration
// Documentation: https://open-meteo.com/en/docs

const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_API_URL = "https://geocoding-api.open-meteo.com/v1/search";

/**
 * WMO Weather interpretation codes
 * https://open-meteo.com/en/docs#weathervariables
 */
export const WMO_CODES: Record<number, { description: string; icon: string }> =
  {
    0: { description: "Clear sky", icon: "☀" },
    1: { description: "Mainly clear", icon: "🌤" },
    2: { description: "Partly cloudy", icon: "⛅" },
    3: { description: "Overcast", icon: "☁" },
    45: { description: "Fog", icon: "🌫" },
    48: { description: "Depositing rime fog", icon: "🌫" },
    51: { description: "Light drizzle", icon: "🌧" },
    53: { description: "Moderate drizzle", icon: "🌧" },
    55: { description: "Dense drizzle", icon: "🌧" },
    56: { description: "Light freezing drizzle", icon: "🌨" },
    57: { description: "Dense freezing drizzle", icon: "🌨" },
    61: { description: "Slight rain", icon: "🌧" },
    63: { description: "Moderate rain", icon: "🌧" },
    65: { description: "Heavy rain", icon: "🌧" },
    66: { description: "Light freezing rain", icon: "🌨" },
    67: { description: "Heavy freezing rain", icon: "🌨" },
    71: { description: "Slight snow", icon: "❄" },
    73: { description: "Moderate snow", icon: "❄" },
    75: { description: "Heavy snow", icon: "❄" },
    77: { description: "Snow grains", icon: "❄" },
    80: { description: "Slight rain showers", icon: "🌦" },
    81: { description: "Moderate rain showers", icon: "🌦" },
    82: { description: "Violent rain showers", icon: "⛈" },
    85: { description: "Slight snow showers", icon: "🌨" },
    86: { description: "Heavy snow showers", icon: "🌨" },
    95: { description: "Thunderstorm", icon: "⛈" },
    96: { description: "Thunderstorm with slight hail", icon: "⛈" },
    99: { description: "Thunderstorm with heavy hail", icon: "⛈" },
  };

/**
 * Get weather description and icon from WMO code
 */
export function getWeatherInfo(code: number): {
  description: string;
  icon: string;
} {
  return WMO_CODES[code] || { description: "Unknown", icon: "?" };
}

/**
 * Location from geocoding API
 */
export interface GeoLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  country: string;
  admin1?: string; // State/province
  timezone: string;
  population?: number;
}

/**
 * Current weather conditions
 */
export interface CurrentWeather {
  time: Date;
  temperature: number; // Celsius
  apparentTemperature: number; // Feels like
  humidity: number; // %
  precipitation: number; // mm
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  windSpeed: number; // km/h
  windDirection: number; // degrees
}

/**
 * Daily forecast
 */
export interface DailyForecast {
  date: Date;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number; // %
}

/**
 * Full weather data for a location
 */
export interface WeatherData {
  location: GeoLocation;
  current: CurrentWeather;
  daily: DailyForecast[];
  lastUpdated: Date;
}

/**
 * Weather Service
 */
export class WeatherService {
  private cache: Map<string, { data: WeatherData; expiry: number }> = new Map();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes

  /**
   * Search for locations by name
   */
  async searchLocations(
    query: string,
    count: number = 5,
  ): Promise<GeoLocation[]> {
    const url = `${GEOCODING_API_URL}?name=${encodeURIComponent(query)}&count=${count}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      results?: Array<{
        id: number;
        name: string;
        latitude: number;
        longitude: number;
        elevation: number;
        country: string;
        admin1?: string;
        timezone: string;
        population?: number;
      }>;
    };

    if (!data.results) {
      return [];
    }

    return data.results.map((r) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      elevation: r.elevation,
      country: r.country,
      admin1: r.admin1,
      timezone: r.timezone,
      population: r.population,
    }));
  }

  /**
   * Get weather for a location
   */
  async getWeather(location: GeoLocation): Promise<WeatherData> {
    const cacheKey = `${location.latitude},${location.longitude}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const params = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "auto",
    });

    const url = `${WEATHER_API_URL}?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      current: {
        time: string;
        temperature_2m: number;
        apparent_temperature: number;
        relative_humidity_2m: number;
        precipitation: number;
        weather_code: number;
        wind_speed_10m: number;
        wind_direction_10m: number;
      };
      daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: number[];
      };
    };

    const weatherInfo = getWeatherInfo(data.current.weather_code);

    const weatherData: WeatherData = {
      location,
      current: {
        time: new Date(data.current.time),
        temperature: data.current.temperature_2m,
        apparentTemperature: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        precipitation: data.current.precipitation,
        weatherCode: data.current.weather_code,
        weatherDescription: weatherInfo.description,
        weatherIcon: weatherInfo.icon,
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
      },
      daily: data.daily.time.map((time, i) => {
        const info = getWeatherInfo(data.daily.weather_code[i] ?? 0);
        return {
          date: new Date(time),
          weatherCode: data.daily.weather_code[i] ?? 0,
          weatherDescription: info.description,
          weatherIcon: info.icon,
          tempMax: data.daily.temperature_2m_max[i] ?? 0,
          tempMin: data.daily.temperature_2m_min[i] ?? 0,
          precipitationProbability:
            data.daily.precipitation_probability_max[i] ?? 0,
        };
      }),
      lastUpdated: new Date(),
    };

    this.cache.set(cacheKey, {
      data: weatherData,
      expiry: Date.now() + this.cacheTimeout,
    });

    return weatherData;
  }

  /**
   * Get weather by city name (convenience method)
   */
  async getWeatherByCity(city: string): Promise<WeatherData | null> {
    const locations = await this.searchLocations(city, 1);
    if (locations.length === 0) {
      return null;
    }
    return this.getWeather(locations[0]!);
  }
}

// Default service instance
export const weatherService = new WeatherService();

/**
 * Format temperature with unit
 */
export function formatTemp(celsius: number, unit: "C" | "F" = "C"): string {
  if (unit === "F") {
    return `${Math.round((celsius * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

/**
 * Format wind direction as cardinal
 */
export function windDirectionToCardinal(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index] || "N";
}

/**
 * Get day name from date
 */
export function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}
