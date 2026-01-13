// Habit Tracking Service - Persistence and calculations

import os from "os";
import path from "path";
import {
  type Habit,
  type SerializedHabit,
  type HabitsData,
  type HabitCategory,
} from "../canvases/habits/types";

// Default file path for habits
const DEFAULT_HABITS_DIR = path.join(os.homedir(), ".claude-canvas");
const DEFAULT_HABITS_PATH = path.join(DEFAULT_HABITS_DIR, "habits.json");

// Current data version
const DATA_VERSION = 1;

// Generate unique ID
export function generateHabitId(): string {
  return `habit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get today's date as ISO string (YYYY-MM-DD)
export function getTodayKey(): string {
  return new Date().toISOString().split("T")[0]!;
}

// Get date key for a specific date
export function getDateKey(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

// Get the start of the current week (Monday)
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust so Monday = 0
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get array of dates for the current week (Mon-Sun)
export function getWeekDates(weekStart: Date = getWeekStart()): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

// Check if a date is today
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// Check if a date is in the future
export function isFuture(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(date);
  check.setHours(0, 0, 0, 0);
  return check > today;
}

// Calculate streak for a habit
export function calculateStreak(habit: Habit): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);

  // Check if today is completed, if not start from yesterday
  const todayKey = getDateKey(today);
  if (!habit.completions[todayKey]) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count consecutive completed days going backwards
  while (true) {
    const key = getDateKey(checkDate);
    if (habit.completions[key]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// Calculate completion percentage for current week
export function calculateWeeklyCompletion(habit: Habit): number {
  const weekDates = getWeekDates();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let completed = 0;
  let total = 0;

  for (const date of weekDates) {
    if (date <= today) {
      total++;
      const key = getDateKey(date);
      if (habit.completions[key]) {
        completed++;
      }
    }
  }

  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

// Calculate overall completion percentage (last 30 days)
export function calculateOverallCompletion(habit: Habit): number {
  const today = new Date();
  const createdAt = new Date(habit.createdAt);
  createdAt.setHours(0, 0, 0, 0);

  // Go back 30 days or to creation date, whichever is more recent
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo > createdAt ? thirtyDaysAgo : createdAt;

  let completed = 0;
  let total = 0;
  const checkDate = new Date(startDate);

  while (checkDate <= today) {
    total++;
    const key = getDateKey(checkDate);
    if (habit.completions[key]) {
      completed++;
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }

  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

// Serialize habit for storage
export function serializeHabit(habit: Habit): SerializedHabit {
  return {
    ...habit,
    createdAt: habit.createdAt.toISOString(),
  };
}

// Deserialize habit from storage
export function deserializeHabit(serialized: SerializedHabit): Habit {
  return {
    ...serialized,
    createdAt: new Date(serialized.createdAt),
  };
}

// Ensure directory exists
async function ensureDir(dirPath: string): Promise<void> {
  try {
    const dir = Bun.file(dirPath);
    // Check if it exists by trying to get stats
    // If it fails, we'll create it
  } catch {
    // Directory doesn't exist
  }

  // Use mkdir to ensure directory exists
  const fs = await import("fs/promises");
  await fs.mkdir(dirPath, { recursive: true });
}

// Load habits from file
export async function loadHabits(filePath?: string): Promise<Habit[]> {
  const fp = filePath || DEFAULT_HABITS_PATH;

  try {
    const file = Bun.file(fp);
    if (await file.exists()) {
      const text = await file.text();
      const data = JSON.parse(text) as HabitsData;
      return data.habits.map(deserializeHabit);
    }
  } catch (err) {
    // File doesn't exist or is invalid
  }

  return [];
}

// Save habits to file
export async function saveHabits(
  habits: Habit[],
  filePath?: string,
): Promise<void> {
  const fp = filePath || DEFAULT_HABITS_PATH;
  const dir = path.dirname(fp);

  // Ensure directory exists
  await ensureDir(dir);

  const data: HabitsData = {
    version: DATA_VERSION,
    habits: habits.map(serializeHabit),
  };

  await Bun.write(fp, JSON.stringify(data, null, 2));
}

// Create a new habit
export function createHabit(
  name: string,
  category: HabitCategory,
  description?: string,
): Habit {
  return {
    id: generateHabitId(),
    name,
    category,
    description,
    createdAt: new Date(),
    completions: {},
  };
}

// Toggle habit completion for a date
export function toggleCompletion(habit: Habit, date: Date = new Date()): Habit {
  const key = getDateKey(date);
  const newCompletions = { ...habit.completions };

  if (newCompletions[key]) {
    delete newCompletions[key];
  } else {
    newCompletions[key] = true;
  }

  return {
    ...habit,
    completions: newCompletions,
  };
}

// Check if habit is completed for a date
export function isCompleted(habit: Habit, date: Date = new Date()): boolean {
  const key = getDateKey(date);
  return habit.completions[key] === true;
}

// Get best streak ever
export function getBestStreak(habit: Habit): number {
  const keys = Object.keys(habit.completions).sort();
  if (keys.length === 0) return 0;

  let bestStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  for (const key of keys) {
    if (habit.completions[key]) {
      const date = new Date(key);
      if (lastDate) {
        const diff =
          (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      lastDate = date;
      bestStreak = Math.max(bestStreak, currentStreak);
    }
  }

  return bestStreak;
}

// Get habits stats summary
export interface HabitsStats {
  totalHabits: number;
  completedToday: number;
  averageWeeklyCompletion: number;
  longestStreak: number;
  byCategory: Record<HabitCategory, number>;
}

export function getHabitsStats(habits: Habit[]): HabitsStats {
  const todayKey = getTodayKey();

  const byCategory: Record<HabitCategory, number> = {
    health: 0,
    productivity: 0,
    learning: 0,
    fitness: 0,
    mindfulness: 0,
    social: 0,
    creative: 0,
    other: 0,
  };

  let completedToday = 0;
  let totalWeeklyCompletion = 0;
  let longestStreak = 0;

  for (const habit of habits) {
    byCategory[habit.category]++;

    if (habit.completions[todayKey]) {
      completedToday++;
    }

    totalWeeklyCompletion += calculateWeeklyCompletion(habit);
    longestStreak = Math.max(longestStreak, calculateStreak(habit));
  }

  return {
    totalHabits: habits.length,
    completedToday,
    averageWeeklyCompletion:
      habits.length > 0 ? Math.round(totalWeeklyCompletion / habits.length) : 0,
    longestStreak,
    byCategory,
  };
}
