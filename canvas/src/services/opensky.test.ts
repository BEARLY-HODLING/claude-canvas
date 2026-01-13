// Quick test for OpenSky API
// Run with: bun run src/services/opensky.test.ts

import {
  opensky,
  metersToFeet,
  msToKnots,
  formatFlightNumber,
  getAirlineName,
} from "./opensky";

async function testOpenSkyAPI() {
  console.log("=== OpenSky API Test ===\n");

  try {
    // Test 1: Get flights over continental US (smaller area to reduce response size)
    console.log("Test 1: Fetching flights over San Francisco Bay Area...");
    const sfBayFlights = await opensky.getFlightsNear(37.6213, -122.379, 1); // SFO area
    console.log(`Found ${sfBayFlights.length} aircraft near SFO\n`);

    if (sfBayFlights.length > 0) {
      console.log("Sample aircraft:");
      sfBayFlights.slice(0, 5).forEach((flight, i) => {
        const altitude = metersToFeet(flight.baroAltitude);
        const speed = msToKnots(flight.velocity);
        const airline = getAirlineName(flight.callsign);
        const flightNum = formatFlightNumber(flight.callsign);

        console.log(
          `  ${i + 1}. ${flightNum}${airline ? ` (${airline})` : ""}`,
        );
        console.log(`     ICAO24: ${flight.icao24}`);
        console.log(
          `     Position: ${flight.latitude?.toFixed(4)}, ${flight.longitude?.toFixed(4)}`,
        );
        console.log(
          `     Altitude: ${altitude !== null ? `${altitude} ft` : "N/A"}`,
        );
        console.log(`     Speed: ${speed !== null ? `${speed} kts` : "N/A"}`);
        console.log(`     Heading: ${flight.trueTrack?.toFixed(0)}°`);
        console.log(`     On Ground: ${flight.onGround}`);
        console.log(`     Country: ${flight.originCountry}`);
        console.log("");
      });
    }

    // Test 2: Search by callsign (if we found any flights)
    const firstFlight = sfBayFlights[0];
    if (sfBayFlights.length > 0 && firstFlight?.callsign) {
      const searchCallsign = firstFlight.callsign.trim().substring(0, 3);
      console.log(
        `\nTest 2: Searching for flights with callsign prefix "${searchCallsign}"...`,
      );
      const searchResults = await opensky.searchByCallsign(searchCallsign);
      console.log(`Found ${searchResults.length} matching flights\n`);
    }

    // Test 3: Get all states (limited info)
    console.log("Test 3: Getting global flight count...");
    const allStates = await opensky.getAllStates();
    console.log(`Total aircraft worldwide: ${allStates.states.length}`);
    console.log(
      `API timestamp: ${new Date(allStates.time * 1000).toISOString()}`,
    );

    // Statistics
    const airborne = allStates.states.filter((s) => !s.onGround).length;
    const onGround = allStates.states.filter((s) => s.onGround).length;
    const withCallsign = allStates.states.filter((s) => s.callsign).length;

    console.log(`\nStatistics:`);
    console.log(`  Airborne: ${airborne}`);
    console.log(`  On Ground: ${onGround}`);
    console.log(`  With Callsign: ${withCallsign}`);

    console.log("\n=== All tests passed! ===");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run test
testOpenSkyAPI();
