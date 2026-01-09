// Test System Service
// Run with: bun run src/services/system.test.ts

import {
  systemService,
  formatBytes,
  formatUptime,
  progressBar,
  sparkline,
} from "./system";

async function testSystemService() {
  console.log("=== System Service Test ===\n");

  try {
    // Test 1: System overview
    console.log("Test 1: System Overview");
    const overview = systemService.getOverview();
    console.log(`  Hostname: ${overview.hostname}`);
    console.log(`  Platform: ${overview.platform} (${overview.arch})`);
    console.log(`  Release: ${overview.release}`);
    console.log(`  Uptime: ${formatUptime(overview.uptime)}`);
    console.log(
      `  Load Avg: ${overview.loadAvg.map((l) => l.toFixed(2)).join(", ")}`,
    );

    // Test 2: CPU usage
    console.log("\n\nTest 2: CPU Usage");
    // First call to establish baseline
    systemService.getCpuUsage();
    // Wait a bit for actual usage data
    await new Promise((r) => setTimeout(r, 500));
    const cpu = systemService.getCpuUsage();
    console.log(`  Model: ${cpu.model}`);
    console.log(`  Cores: ${cpu.cores}`);
    console.log(`  Speed: ${cpu.speed} MHz`);
    console.log(`  Usage: ${progressBar(cpu.total, 30)} ${cpu.total}%`);
    console.log(`    User: ${cpu.user}%  System: ${cpu.system}%`);

    // Test 3: Memory
    console.log("\n\nTest 3: Memory");
    const mem = systemService.getMemoryInfo();
    console.log(`  Total: ${formatBytes(mem.total)}`);
    console.log(`  Used: ${formatBytes(mem.used)} (${mem.usedPercent}%)`);
    console.log(`  Free: ${formatBytes(mem.free)}`);
    console.log(`  ${progressBar(mem.usedPercent, 30)}`);

    // Test 4: Disk
    console.log("\n\nTest 4: Disk Info");
    const disks = await systemService.getDiskInfo();
    for (const disk of disks) {
      console.log(`  ${disk.mount}:`);
      console.log(`    ${formatBytes(disk.used)} / ${formatBytes(disk.total)}`);
      console.log(
        `    ${progressBar(disk.usedPercent, 20)} ${disk.usedPercent}%`,
      );
    }

    // Test 5: Processes
    console.log("\n\nTest 5: Top Processes (by CPU)");
    const processes = await systemService.getProcesses(8);
    console.log("  PID     CPU%  MEM%  NAME");
    for (const proc of processes) {
      const pid = proc.pid.toString().padStart(6);
      const cpu = proc.cpu.toFixed(1).padStart(5);
      const mem = proc.memory.toFixed(1).padStart(5);
      console.log(`  ${pid}  ${cpu}  ${mem}  ${proc.name.slice(0, 30)}`);
    }

    // Test 6: Network
    console.log("\n\nTest 6: Network Interfaces");
    const network = systemService.getNetworkInfo();
    for (const iface of network) {
      if (!iface.internal) {
        console.log(`  ${iface.name}: ${iface.address}`);
      }
    }

    // Test 7: Sparkline
    console.log("\n\nTest 7: Sparkline Visualization");
    const sampleData = [10, 25, 30, 45, 60, 55, 70, 85, 75, 60, 50, 40];
    console.log(`  CPU History: ${sparkline(sampleData)}`);

    // Test 8: Full snapshot
    console.log("\n\nTest 8: Full System Snapshot");
    const snapshot = await systemService.getSnapshot();
    console.log(`  Timestamp: ${snapshot.timestamp.toISOString()}`);
    console.log(`  Processes: ${snapshot.processes.length}`);
    console.log(`  Disks: ${snapshot.disks.length}`);
    console.log(`  Network interfaces: ${snapshot.network.length}`);

    console.log("\n=== All tests passed! ===");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testSystemService();
