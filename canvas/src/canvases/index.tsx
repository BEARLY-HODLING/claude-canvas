import React from "react";
import { render } from "ink";
import { Calendar, type CalendarConfig } from "./calendar";
import { Document } from "./document";
import type { DocumentConfig } from "./document/types";
import { FlightCanvas } from "./flight";
import { FlightTracker } from "./flight-tracker";
import type { FlightConfig } from "./flight/types";
import { WeatherCanvas } from "./weather";
import type { WeatherConfig } from "./weather/types";
import { SystemCanvas } from "./system";
import type { SystemConfig } from "./system/types";
import { CanvasErrorBoundary } from "../components/error-boundary";

// Clear screen and hide cursor
function clearScreen() {
  process.stdout.write("\x1b[2J\x1b[H\x1b[?25l");
}

// Show cursor on exit
function showCursor() {
  process.stdout.write("\x1b[?25h");
}

export interface RenderOptions {
  socketPath?: string;
  scenario?: string;
}

export async function renderCanvas(
  kind: string,
  id: string,
  config?: unknown,
  options?: RenderOptions,
): Promise<void> {
  // Clear screen before rendering
  clearScreen();

  // Ensure cursor is shown on exit
  process.on("exit", showCursor);
  process.on("SIGINT", () => {
    showCursor();
    process.exit();
  });

  switch (kind) {
    case "calendar":
      return renderCalendar(id, config as CalendarConfig | undefined, options);
    case "document":
      return renderDocument(id, config as DocumentConfig | undefined, options);
    case "flight": {
      const flightConfig = config as FlightConfig | undefined;
      // Use tracker mode if explicitly set or if scenario is "tracker"
      if (flightConfig?.mode === "tracker" || options?.scenario === "tracker") {
        return renderFlightTracker(id, flightConfig, options);
      }
      return renderFlight(id, flightConfig, options);
    }
    case "tracker":
      // Direct tracker canvas
      return renderFlightTracker(
        id,
        config as FlightConfig | undefined,
        options,
      );
    case "weather":
      return renderWeather(id, config as WeatherConfig | undefined, options);
    case "system":
      return renderSystem(id, config as SystemConfig | undefined, options);
    default:
      console.error(`Unknown canvas kind: ${kind}`);
      process.exit(1);
  }
}

async function renderCalendar(
  id: string,
  config?: CalendarConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="calendar">
      <Calendar
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "display"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderDocument(
  id: string,
  config?: DocumentConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="document">
      <Document
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "display"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderFlight(
  id: string,
  config?: FlightConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="flight">
      <FlightCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "booking"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderFlightTracker(
  id: string,
  config?: FlightConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="tracker">
      <FlightTracker
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "tracker"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderWeather(
  id: string,
  config?: WeatherConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="weather">
      <WeatherCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "weather"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderSystem(
  id: string,
  config?: SystemConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="system">
      <SystemCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "system"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}
