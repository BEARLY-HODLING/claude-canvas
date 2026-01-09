// Test Weather Service
// Run with: bun run src/services/weather.test.ts

import {
  weatherService,
  formatTemp,
  windDirectionToCardinal,
  getDayName,
} from "./weather";

async function testWeatherService() {
  console.log("=== Weather Service Test ===\n");

  try {
    // Test 1: Search for locations
    console.log("Test 1: Searching for 'San Francisco'...");
    const locations = await weatherService.searchLocations("San Francisco", 3);
    console.log(`Found ${locations.length} locations:`);
    locations.forEach((loc, i) => {
      console.log(
        `  ${i + 1}. ${loc.name}, ${loc.admin1 || ""}, ${loc.country} (${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)})`,
      );
    });

    // Test 2: Get weather for first location
    if (locations.length > 0) {
      console.log("\n\nTest 2: Getting weather for first location...");
      const weather = await weatherService.getWeather(locations[0]!);

      console.log(`\nCurrent Weather in ${weather.location.name}:`);
      console.log(
        `  ${weather.current.weatherIcon} ${weather.current.weatherDescription}`,
      );
      console.log(`  Temperature: ${formatTemp(weather.current.temperature)}`);
      console.log(
        `  Feels like: ${formatTemp(weather.current.apparentTemperature)}`,
      );
      console.log(`  Humidity: ${weather.current.humidity}%`);
      console.log(
        `  Wind: ${weather.current.windSpeed} km/h ${windDirectionToCardinal(weather.current.windDirection)}`,
      );

      console.log("\n7-Day Forecast:");
      weather.daily.forEach((day) => {
        const dayName = getDayName(day.date).padEnd(3);
        const icon = day.weatherIcon;
        const high = formatTemp(day.tempMax).padStart(5);
        const low = formatTemp(day.tempMin).padStart(5);
        const rain = `${day.precipitationProbability}%`.padStart(4);
        console.log(`  ${dayName} ${icon} ${high}/${low} 💧${rain}`);
      });
    }

    // Test 3: Convenience method
    console.log("\n\nTest 3: getWeatherByCity('Tokyo')...");
    const tokyoWeather = await weatherService.getWeatherByCity("Tokyo");
    if (tokyoWeather) {
      console.log(
        `Tokyo: ${tokyoWeather.current.weatherIcon} ${formatTemp(tokyoWeather.current.temperature)} - ${tokyoWeather.current.weatherDescription}`,
      );
    }

    console.log("\n=== All tests passed! ===");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testWeatherService();
