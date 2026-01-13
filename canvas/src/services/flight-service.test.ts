// Test FlightService - data mapping and search
// Run with: bun run src/services/flight-service.test.ts

import { flightService, formatFlightInfo } from "./flight-service";

async function testFlightService() {
  console.log("=== FlightService Test ===\n");

  try {
    // Test 1: Search for United flights
    console.log("Test 1: Searching for United Airlines flights (UAL)...");
    const unitedFlights = await flightService.searchFlights("UAL");
    console.log(`Found ${unitedFlights.length} United flights\n`);

    if (unitedFlights.length > 0) {
      console.log("Sample flight (TrackedFlight format):");
      const sample = unitedFlights[0]!;
      console.log(JSON.stringify(sample, null, 2));
      console.log("\nFormatted info:");
      formatFlightInfo(sample).forEach((line) => console.log(`  ${line}`));
    }

    // Test 2: Get flights near LAX
    console.log("\n\nTest 2: Searching for flights near LAX...");
    const laxFlights = await flightService.getFlightsNear(33.9425, -118.408, 1);
    console.log(`Found ${laxFlights.length} flights near LAX`);

    if (laxFlights.length > 0) {
      console.log("\nTop 5 flights:");
      laxFlights.slice(0, 5).forEach((f, i) => {
        const alt =
          f.altitude !== null ? `${Math.round(f.altitude / 1000)}k ft` : "---";
        const spd = f.speed !== null ? `${f.speed} kts` : "---";
        console.log(
          `  ${i + 1}. ${f.flightNumber.padEnd(8)} | ${f.status.padEnd(8)} | ${alt.padEnd(8)} | ${spd}`,
        );
      });
    }

    // Test 3: Get stats
    console.log("\n\nTest 3: Global traffic stats...");
    const stats = await flightService.getStats();
    console.log(`Total aircraft: ${stats.total.toLocaleString()}`);
    console.log(`Airborne: ${stats.airborne.toLocaleString()}`);
    console.log(`On ground: ${stats.onGround.toLocaleString()}`);
    console.log(`With callsign: ${stats.withCallsign.toLocaleString()}`);
    console.log(`Timestamp: ${stats.timestamp.toISOString()}`);

    // Test 4: Search by route (SFO -> LAX)
    console.log("\n\nTest 4: Searching for flights on SFO → LAX route...");
    const routeFlights = await flightService.searchByRoute("SFO", "LAX");
    console.log(`Found ${routeFlights.length} flights on SFO → LAX route`);

    if (routeFlights.length > 0) {
      console.log("\nFlights on route:");
      routeFlights.slice(0, 5).forEach((f, i) => {
        const alt =
          f.altitude !== null ? `${Math.round(f.altitude / 1000)}k ft` : "---";
        console.log(
          `  ${i + 1}. ${f.flightNumber.padEnd(8)} | ${f.status.padEnd(8)} | ${alt}`,
        );
      });
    }

    console.log("\n=== All tests passed! ===");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testFlightService();
