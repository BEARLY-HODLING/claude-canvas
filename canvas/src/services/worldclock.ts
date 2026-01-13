// World Clock Service - Timezone utilities and preset cities

/**
 * City/timezone information
 */
export interface CityTimezone {
  id: string;
  name: string;
  timezone: string;
  country: string;
  countryCode: string;
  region?: string;
  utcOffset: number; // Minutes from UTC
  abbreviation: string;
}

/**
 * Time info for a specific timezone
 */
export interface TimezoneTime {
  city: CityTimezone;
  time: Date;
  hour: number;
  minute: number;
  second: number;
  hour12: number;
  ampm: "AM" | "PM";
  dateString: string;
  dayName: string;
  isDST: boolean;
  offsetFromLocal: number; // Hours difference from local
  offsetString: string;
  isNextDay: boolean;
  isPrevDay: boolean;
}

/**
 * Preset cities with their timezones
 */
export const PRESET_CITIES: CityTimezone[] = [
  {
    id: "nyc",
    name: "New York",
    timezone: "America/New_York",
    country: "United States",
    countryCode: "US",
    region: "EST/EDT",
    utcOffset: -300,
    abbreviation: "ET",
  },
  {
    id: "la",
    name: "Los Angeles",
    timezone: "America/Los_Angeles",
    country: "United States",
    countryCode: "US",
    region: "PST/PDT",
    utcOffset: -480,
    abbreviation: "PT",
  },
  {
    id: "chi",
    name: "Chicago",
    timezone: "America/Chicago",
    country: "United States",
    countryCode: "US",
    region: "CST/CDT",
    utcOffset: -360,
    abbreviation: "CT",
  },
  {
    id: "lon",
    name: "London",
    timezone: "Europe/London",
    country: "United Kingdom",
    countryCode: "GB",
    region: "GMT/BST",
    utcOffset: 0,
    abbreviation: "GMT",
  },
  {
    id: "par",
    name: "Paris",
    timezone: "Europe/Paris",
    country: "France",
    countryCode: "FR",
    region: "CET/CEST",
    utcOffset: 60,
    abbreviation: "CET",
  },
  {
    id: "ber",
    name: "Berlin",
    timezone: "Europe/Berlin",
    country: "Germany",
    countryCode: "DE",
    region: "CET/CEST",
    utcOffset: 60,
    abbreviation: "CET",
  },
  {
    id: "tok",
    name: "Tokyo",
    timezone: "Asia/Tokyo",
    country: "Japan",
    countryCode: "JP",
    utcOffset: 540,
    abbreviation: "JST",
  },
  {
    id: "sha",
    name: "Shanghai",
    timezone: "Asia/Shanghai",
    country: "China",
    countryCode: "CN",
    utcOffset: 480,
    abbreviation: "CST",
  },
  {
    id: "hkg",
    name: "Hong Kong",
    timezone: "Asia/Hong_Kong",
    country: "Hong Kong",
    countryCode: "HK",
    utcOffset: 480,
    abbreviation: "HKT",
  },
  {
    id: "sin",
    name: "Singapore",
    timezone: "Asia/Singapore",
    country: "Singapore",
    countryCode: "SG",
    utcOffset: 480,
    abbreviation: "SGT",
  },
  {
    id: "syd",
    name: "Sydney",
    timezone: "Australia/Sydney",
    country: "Australia",
    countryCode: "AU",
    region: "AEST/AEDT",
    utcOffset: 600,
    abbreviation: "AEST",
  },
  {
    id: "dub",
    name: "Dubai",
    timezone: "Asia/Dubai",
    country: "UAE",
    countryCode: "AE",
    utcOffset: 240,
    abbreviation: "GST",
  },
  {
    id: "mum",
    name: "Mumbai",
    timezone: "Asia/Kolkata",
    country: "India",
    countryCode: "IN",
    utcOffset: 330,
    abbreviation: "IST",
  },
  {
    id: "mow",
    name: "Moscow",
    timezone: "Europe/Moscow",
    country: "Russia",
    countryCode: "RU",
    utcOffset: 180,
    abbreviation: "MSK",
  },
  {
    id: "sao",
    name: "Sao Paulo",
    timezone: "America/Sao_Paulo",
    country: "Brazil",
    countryCode: "BR",
    utcOffset: -180,
    abbreviation: "BRT",
  },
  {
    id: "tor",
    name: "Toronto",
    timezone: "America/Toronto",
    country: "Canada",
    countryCode: "CA",
    region: "EST/EDT",
    utcOffset: -300,
    abbreviation: "ET",
  },
  {
    id: "van",
    name: "Vancouver",
    timezone: "America/Vancouver",
    country: "Canada",
    countryCode: "CA",
    region: "PST/PDT",
    utcOffset: -480,
    abbreviation: "PT",
  },
  {
    id: "ams",
    name: "Amsterdam",
    timezone: "Europe/Amsterdam",
    country: "Netherlands",
    countryCode: "NL",
    region: "CET/CEST",
    utcOffset: 60,
    abbreviation: "CET",
  },
  {
    id: "sel",
    name: "Seoul",
    timezone: "Asia/Seoul",
    country: "South Korea",
    countryCode: "KR",
    utcOffset: 540,
    abbreviation: "KST",
  },
  {
    id: "jkt",
    name: "Jakarta",
    timezone: "Asia/Jakarta",
    country: "Indonesia",
    countryCode: "ID",
    utcOffset: 420,
    abbreviation: "WIB",
  },
  {
    id: "del",
    name: "Delhi",
    timezone: "Asia/Kolkata",
    country: "India",
    countryCode: "IN",
    utcOffset: 330,
    abbreviation: "IST",
  },
  {
    id: "cai",
    name: "Cairo",
    timezone: "Africa/Cairo",
    country: "Egypt",
    countryCode: "EG",
    utcOffset: 120,
    abbreviation: "EET",
  },
  {
    id: "joh",
    name: "Johannesburg",
    timezone: "Africa/Johannesburg",
    country: "South Africa",
    countryCode: "ZA",
    utcOffset: 120,
    abbreviation: "SAST",
  },
  {
    id: "den",
    name: "Denver",
    timezone: "America/Denver",
    country: "United States",
    countryCode: "US",
    region: "MST/MDT",
    utcOffset: -420,
    abbreviation: "MT",
  },
  {
    id: "hon",
    name: "Honolulu",
    timezone: "Pacific/Honolulu",
    country: "United States",
    countryCode: "US",
    utcOffset: -600,
    abbreviation: "HST",
  },
  {
    id: "utc",
    name: "UTC",
    timezone: "UTC",
    country: "Universal",
    countryCode: "UTC",
    utcOffset: 0,
    abbreviation: "UTC",
  },
];

/**
 * WorldClock Service class
 */
export class WorldClockService {
  /**
   * Get current time for a timezone
   */
  getTimeForTimezone(city: CityTimezone, now?: Date): TimezoneTime {
    const date = now || new Date();

    // Get time in target timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: city.timezone,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    };

    // Parse the formatted time
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(date);

    const getValue = (type: string): string => {
      const part = parts.find((p) => p.type === type);
      return part?.value || "0";
    };

    const hour = parseInt(getValue("hour"), 10);
    const minute = parseInt(getValue("minute"), 10);
    const second = parseInt(getValue("second"), 10);
    const dayName = getValue("weekday");

    // Calculate 12-hour format
    const hour12 = hour % 12 || 12;
    const ampm = hour < 12 ? "AM" : "PM";

    // Get formatted date string
    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: city.timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const dateString = dateFormatter.format(date);

    // Calculate offset from local
    const localOffset = date.getTimezoneOffset(); // Minutes, inverted
    const targetOffset = this.getTimezoneOffset(city.timezone, date);
    const offsetDiff = (targetOffset + localOffset) / 60; // Hours

    // Check if DST is active
    const isDST = this.isDaylightSavingTime(city.timezone, date);

    // Format offset string
    const offsetString = this.formatOffset(offsetDiff);

    // Check if different day from local
    const localDate = date.getDate();
    const localFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: city.timezone,
      day: "numeric",
    });
    const targetDate = parseInt(localFormatter.format(date), 10);
    const isNextDay = targetDate > localDate;
    const isPrevDay = targetDate < localDate;

    return {
      city,
      time: date,
      hour,
      minute,
      second,
      hour12,
      ampm,
      dateString,
      dayName,
      isDST,
      offsetFromLocal: offsetDiff,
      offsetString,
      isNextDay,
      isPrevDay,
    };
  }

  /**
   * Get timezone offset in minutes (same sign convention as getTimezoneOffset)
   */
  private getTimezoneOffset(timezone: string, date: Date): number {
    // Get UTC time
    const utcTime = date.getTime();

    // Format in target timezone to get local values
    const tzFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = tzFormatter.formatToParts(date);
    const getValue = (type: string): number => {
      const part = parts.find((p) => p.type === type);
      return parseInt(part?.value || "0", 10);
    };

    const year = getValue("year");
    const month = getValue("month") - 1; // Months are 0-indexed
    const day = getValue("day");
    const hour = getValue("hour");
    const minute = getValue("minute");
    const second = getValue("second");

    // Create date in that timezone (as if it were local)
    const tzTime = Date.UTC(year, month, day, hour, minute, second);

    // Difference is the offset
    return Math.round((utcTime - tzTime) / (60 * 1000));
  }

  /**
   * Check if DST is active for a timezone
   */
  private isDaylightSavingTime(timezone: string, date: Date): boolean {
    // Compare offset with January (winter) offset
    const january = new Date(date.getFullYear(), 0, 1);
    const july = new Date(date.getFullYear(), 6, 1);

    const januaryOffset = this.getTimezoneOffset(timezone, january);
    const julyOffset = this.getTimezoneOffset(timezone, july);
    const currentOffset = this.getTimezoneOffset(timezone, date);

    // DST is when current offset differs from winter offset
    // In northern hemisphere: winter is January
    // In southern hemisphere: winter is July
    const winterOffset = Math.min(januaryOffset, julyOffset);
    return currentOffset !== winterOffset && januaryOffset !== julyOffset;
  }

  /**
   * Format offset as string (+5:30, -8:00, etc)
   */
  private formatOffset(hours: number): string {
    const sign = hours >= 0 ? "+" : "";
    const absHours = Math.abs(hours);
    const wholeHours = Math.floor(absHours);
    const minutes = Math.round((absHours - wholeHours) * 60);

    if (minutes === 0) {
      return `${sign}${hours}h`;
    }
    return `${sign}${wholeHours}:${minutes.toString().padStart(2, "0")}`;
  }

  /**
   * Search cities by name
   */
  searchCities(query: string): CityTimezone[] {
    const lowerQuery = query.toLowerCase();
    return PRESET_CITIES.filter(
      (city) =>
        city.name.toLowerCase().includes(lowerQuery) ||
        city.country.toLowerCase().includes(lowerQuery) ||
        city.timezone.toLowerCase().includes(lowerQuery) ||
        city.abbreviation.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Get city by ID
   */
  getCityById(id: string): CityTimezone | undefined {
    return PRESET_CITIES.find((city) => city.id === id);
  }

  /**
   * Get all preset cities
   */
  getAllCities(): CityTimezone[] {
    return [...PRESET_CITIES];
  }

  /**
   * Convert time between timezones
   */
  convertTime(
    sourceCity: CityTimezone,
    targetCity: CityTimezone,
    sourceTime: Date,
  ): Date {
    // Get offset difference
    const sourceOffset = this.getTimezoneOffset(
      sourceCity.timezone,
      sourceTime,
    );
    const targetOffset = this.getTimezoneOffset(
      targetCity.timezone,
      sourceTime,
    );
    const diffMinutes = sourceOffset - targetOffset;

    // Apply offset
    return new Date(sourceTime.getTime() + diffMinutes * 60 * 1000);
  }

  /**
   * Get local timezone as CityTimezone
   */
  getLocalTimezone(): CityTimezone {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = -new Date().getTimezoneOffset();

    // Try to find matching preset city
    const matchingCity = PRESET_CITIES.find((city) => city.timezone === tz);
    if (matchingCity) {
      return matchingCity;
    }

    // Create custom local city
    return {
      id: "local",
      name: "Local",
      timezone: tz,
      country: "Local",
      countryCode: "LOC",
      utcOffset: offset,
      abbreviation: this.getTimezoneAbbreviation(tz),
    };
  }

  /**
   * Get timezone abbreviation
   */
  private getTimezoneAbbreviation(timezone: string): string {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    return tzPart?.value || "LT";
  }
}

// Default service instance
export const worldClockService = new WorldClockService();

/**
 * Format time with leading zeros
 */
export function formatTimeDigit(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Format time string (HH:MM:SS or HH:MM)
 */
export function formatTimeString(
  hour: number,
  minute: number,
  second?: number,
  use24Hour = true,
): string {
  const h = use24Hour ? hour : hour % 12 || 12;
  const ampm = use24Hour ? "" : hour < 12 ? " AM" : " PM";

  if (second !== undefined) {
    return `${formatTimeDigit(h)}:${formatTimeDigit(minute)}:${formatTimeDigit(second)}${ampm}`;
  }
  return `${formatTimeDigit(h)}:${formatTimeDigit(minute)}${ampm}`;
}

/**
 * Simple ASCII analog clock (7x7)
 */
export function renderAnalogClock(hour: number, minute: number): string[] {
  const lines: string[] = [];
  const center = 3;

  // Clock face template
  const face = ["  12   ", " .   . ", "9  +  3", " .   . ", "   6   "];

  // Calculate hand positions (simplified)
  const hourAngle = ((hour % 12) + minute / 60) * 30; // 30 degrees per hour
  const minuteAngle = minute * 6; // 6 degrees per minute

  // For a simple ASCII representation, we'll just show the numeric time
  // since precise hand drawing is complex in ASCII
  return face;
}

/**
 * Day/night indicator based on time
 */
export function getDayNightIndicator(hour: number): string {
  if (hour >= 6 && hour < 12) return "morning"; // Morning sun
  if (hour >= 12 && hour < 18) return "day"; // Afternoon sun
  if (hour >= 18 && hour < 21) return "evening"; // Evening
  return "night"; // Night moon
}

/**
 * Get day/night emoji
 */
export function getDayNightEmoji(hour: number): string {
  const period = getDayNightIndicator(hour);
  switch (period) {
    case "morning":
      return "sunrise";
    case "day":
      return "sunny";
    case "evening":
      return "sunset";
    case "night":
      return "moon";
    default:
      return "clock";
  }
}
