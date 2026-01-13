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
import { PomodoroCanvas } from "./pomodoro";
import type { PomodoroConfig } from "./pomodoro/types";
import { DashboardCanvas } from "./dashboard";
import type { DashboardConfig } from "./dashboard/types";
import { NotesCanvas } from "./notes";
import type { NotesConfig } from "./notes/types";
import { CryptoCanvas } from "./crypto";
import type { CryptoConfig } from "./crypto/types";
import { GitHubCanvas } from "./github";
import type { GitHubConfig } from "./github/types";
import { NetworkCanvas } from "./network";
import type { NetworkConfig } from "./network/types";
import { DockerCanvas } from "./docker";
import type { DockerConfig } from "./docker/types";
import { LogsCanvas } from "./logs";
import type { LogsConfig } from "./logs/types";
import { ProcessCanvas } from "./process";
import type { ProcessConfig } from "./process/types";
import { DatabaseCanvas } from "./database";
import type { DatabaseConfig } from "./database/types";
import { RSSCanvas } from "./rss";
import type { RSSConfig } from "./rss/types";
import { FilesCanvas } from "./files";
import type { FilesConfig } from "./files/types";
import { ChatCanvas } from "./chat";
import type { ChatConfig } from "./chat/types";
import { ClipboardCanvas } from "./clipboard";
import type { ClipboardConfig } from "./clipboard/types";
import { MusicCanvas } from "./music";
import type { MusicConfig } from "./music/types";
import { TimerCanvas } from "./timer";
import type { TimerConfig } from "./timer/types";
import { CalculatorCanvas } from "./calculator";
import type { CalculatorConfig } from "./calculator/types";
import { BookmarksCanvas } from "./bookmarks";
import type { BookmarksConfig } from "./bookmarks/types";
import { ColorsCanvas } from "./colors";
import type { ColorsConfig } from "./colors/types";
import { HabitsCanvas } from "./habits";
import type { HabitsConfig } from "./habits/types";
import { JSONCanvas } from "./json";
import type { JSONConfig } from "./json/types";
import { KanbanCanvas } from "./kanban";
import type { KanbanConfig } from "./kanban/types";
import { MarkdownCanvas } from "./markdown";
import type { MarkdownConfig } from "./markdown/types";
import { PasswordCanvas } from "./password";
import type { PasswordConfig } from "./password/types";
import { UnitsCanvas } from "./units";
import type { UnitsConfig } from "./units/types";
import { WorldClockCanvas } from "./worldclock";
import type { WorldClockConfig } from "./worldclock/types";
import { RegexCanvas } from "./regex";
import type { RegexConfig } from "./regex/types";
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
    case "pomodoro":
      return renderPomodoro(id, config as PomodoroConfig | undefined, options);
    case "dashboard":
      return renderDashboard(
        id,
        config as DashboardConfig | undefined,
        options,
      );
    case "notes":
      return renderNotes(id, config as NotesConfig | undefined, options);
    case "crypto":
      return renderCrypto(id, config as CryptoConfig | undefined, options);
    case "github":
      return renderGitHub(id, config as GitHubConfig | undefined, options);
    case "network":
      return renderNetwork(id, config as NetworkConfig | undefined, options);
    case "logs":
      return renderLogs(id, config as LogsConfig | undefined, options);
    case "process":
      return renderProcess(id, config as ProcessConfig | undefined, options);
    case "database":
      return renderDatabase(id, config as DatabaseConfig | undefined, options);
    case "rss":
      return renderRSS(id, config as RSSConfig | undefined, options);
    case "files":
      return renderFiles(id, config as FilesConfig | undefined, options);
    case "chat":
      return renderChat(id, config as ChatConfig | undefined, options);
    case "clipboard":
      return renderClipboard(
        id,
        config as ClipboardConfig | undefined,
        options,
      );
    case "music":
      return renderMusic(id, config as MusicConfig | undefined, options);
    case "timer":
      return renderTimer(id, config as TimerConfig | undefined, options);
    case "calculator":
      return renderCalculator(
        id,
        config as CalculatorConfig | undefined,
        options,
      );
    case "bookmarks":
      return renderBookmarks(
        id,
        config as BookmarksConfig | undefined,
        options,
      );
    case "colors":
      return renderColors(id, config as ColorsConfig | undefined, options);
    case "habits":
      return renderHabits(id, config as HabitsConfig | undefined, options);
    case "json":
      return renderJSON(id, config as JSONConfig | undefined, options);
    case "kanban":
      return renderKanban(id, config as KanbanConfig | undefined, options);
    case "markdown":
      return renderMarkdown(id, config as MarkdownConfig | undefined, options);
    case "password":
      return renderPassword(id, config as PasswordConfig | undefined, options);
    case "units":
      return renderUnits(id, config as UnitsConfig | undefined, options);
    case "worldclock":
      return renderWorldClock(
        id,
        config as WorldClockConfig | undefined,
        options,
      );
    case "regex":
      return renderRegex(id, config as RegexConfig | undefined, options);
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

async function renderPomodoro(
  id: string,
  config?: PomodoroConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="pomodoro">
      <PomodoroCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "pomodoro"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderDashboard(
  id: string,
  config?: DashboardConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="dashboard">
      <DashboardCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "dashboard"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderNotes(
  id: string,
  config?: NotesConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="notes">
      <NotesCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "notes"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderCrypto(
  id: string,
  config?: CryptoConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="crypto">
      <CryptoCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "crypto"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderGitHub(
  id: string,
  config?: GitHubConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="github">
      <GitHubCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "github"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderNetwork(
  id: string,
  config?: NetworkConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="network">
      <NetworkCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "network"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderLogs(
  id: string,
  config?: LogsConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="logs">
      <LogsCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "logs"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderProcess(
  id: string,
  config?: ProcessConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="process">
      <ProcessCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "process"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderDatabase(
  id: string,
  config?: DatabaseConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="database">
      <DatabaseCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "database"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderRSS(
  id: string,
  config?: RSSConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="rss">
      <RSSCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "rss"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderFiles(
  id: string,
  config?: FilesConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="files">
      <FilesCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "files"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderChat(
  id: string,
  config?: ChatConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="chat">
      <ChatCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "chat"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderClipboard(
  id: string,
  config?: ClipboardConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="clipboard">
      <ClipboardCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "clipboard"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderMusic(
  id: string,
  config?: MusicConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="music">
      <MusicCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "music"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderTimer(
  id: string,
  config?: TimerConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="timer">
      <TimerCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "timer"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderCalculator(
  id: string,
  config?: CalculatorConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="calculator">
      <CalculatorCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "calculator"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderBookmarks(
  id: string,
  config?: BookmarksConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="bookmarks">
      <BookmarksCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "bookmarks"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderColors(
  id: string,
  config?: ColorsConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="colors">
      <ColorsCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "colors"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderHabits(
  id: string,
  config?: HabitsConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="habits">
      <HabitsCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "habits"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderJSON(
  id: string,
  config?: JSONConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="json">
      <JSONCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "json"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderKanban(
  id: string,
  config?: KanbanConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="kanban">
      <KanbanCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "kanban"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderMarkdown(
  id: string,
  config?: MarkdownConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="markdown">
      <MarkdownCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "markdown"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderPassword(
  id: string,
  config?: PasswordConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="password">
      <PasswordCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "password"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderUnits(
  id: string,
  config?: UnitsConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="units">
      <UnitsCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "units"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderWorldClock(
  id: string,
  config?: WorldClockConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="worldclock">
      <WorldClockCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "worldclock"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}

async function renderRegex(
  id: string,
  config?: RegexConfig,
  options?: RenderOptions,
): Promise<void> {
  const { waitUntilExit } = render(
    <CanvasErrorBoundary canvasKind="regex">
      <RegexCanvas
        id={id}
        config={config}
        socketPath={options?.socketPath}
        scenario={options?.scenario || "regex"}
      />
    </CanvasErrorBoundary>,
    {
      exitOnCtrlC: true,
    },
  );
  await waitUntilExit();
}
