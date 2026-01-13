// Habits Canvas - Habit tracking with week view and streaks

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";
import { useIPCServer } from "./calendar/hooks/use-ipc-server";
import {
  type HabitsConfig,
  type HabitsResult,
  type Habit,
  type HabitCategory,
  type ViewMode,
  HABIT_COLORS,
  CATEGORY_INFO,
  WEEKDAYS,
} from "./habits/types";
import { HelpOverlay, HABITS_BINDINGS } from "../components/help-overlay";
import {
  CanvasNavigator,
  useCanvasNavigation,
  type CanvasOption,
} from "../components/canvas-navigator";
import {
  loadHabits,
  saveHabits,
  createHabit,
  toggleCompletion,
  isCompleted,
  calculateStreak,
  calculateWeeklyCompletion,
  getWeekDates,
  getWeekStart,
  getDateKey,
  isToday,
  isFuture,
  getBestStreak,
} from "../services/habits";
import os from "os";
import path from "path";

interface Props {
  id: string;
  config?: HabitsConfig;
  socketPath?: string;
  scenario?: string;
}

// Default file path
const DEFAULT_HABITS_PATH = path.join(
  os.homedir(),
  ".claude-canvas",
  "habits.json",
);

// Category selector component
function CategorySelector({
  selected,
  onSelect,
}: {
  selected: HabitCategory;
  onSelect: (cat: HabitCategory) => void;
}) {
  const categories: HabitCategory[] = [
    "health",
    "productivity",
    "learning",
    "fitness",
    "mindfulness",
    "social",
    "creative",
    "other",
  ];

  return (
    <Box flexDirection="row" flexWrap="wrap">
      {categories.map((cat) => {
        const info = CATEGORY_INFO[cat];
        const isSelected = cat === selected;
        return (
          <Box key={cat} marginRight={1}>
            <Text
              color={isSelected ? info.color : HABIT_COLORS.muted}
              bold={isSelected}
              inverse={isSelected}
            >
              {" "}
              {cat.charAt(0).toUpperCase() + cat.slice(1)}{" "}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// Habit creation/edit form
function HabitForm({
  habit,
  isNew,
  onSave,
  onCancel,
  width,
}: {
  habit: Partial<Habit> | null;
  isNew: boolean;
  onSave: (name: string, category: HabitCategory, description?: string) => void;
  onCancel: () => void;
  width: number;
}) {
  const [name, setName] = useState(habit?.name || "");
  const [category, setCategory] = useState<HabitCategory>(
    habit?.category || "other",
  );
  const [description, setDescription] = useState(habit?.description || "");
  const [focusField, setFocusField] = useState<"name" | "description">("name");

  const categories: HabitCategory[] = [
    "health",
    "productivity",
    "learning",
    "fitness",
    "mindfulness",
    "social",
    "creative",
    "other",
  ];

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    // Ctrl+S to save
    if (key.ctrl && input === "s") {
      if (name.trim().length > 0) {
        onSave(name.trim(), category, description.trim() || undefined);
      }
      return;
    }

    // Tab to cycle category
    if (key.tab) {
      const idx = categories.indexOf(category);
      const nextIdx = (idx + 1) % categories.length;
      setCategory(categories[nextIdx]!);
      return;
    }

    // Enter to switch fields or save
    if (key.return && !key.ctrl) {
      if (focusField === "name" && name.trim().length > 0) {
        setFocusField("description");
      } else if (focusField === "description" && name.trim().length > 0) {
        onSave(name.trim(), category, description.trim() || undefined);
      }
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={HABIT_COLORS.accent}
      paddingX={1}
      paddingY={1}
      width={width}
    >
      <Box marginBottom={1}>
        <Text color={HABIT_COLORS.accent} bold>
          {"[ "}
          {isNew ? "NEW HABIT" : "EDIT HABIT"}
          {" ]"}
        </Text>
      </Box>

      {/* Name input */}
      <Box marginBottom={1}>
        <Text color={HABIT_COLORS.secondary}>Name: </Text>
        {focusField === "name" ? (
          <TextInput
            value={name}
            onChange={setName}
            placeholder="Enter habit name..."
          />
        ) : (
          <Text color="white">{name}</Text>
        )}
      </Box>

      {/* Category */}
      <Box marginBottom={1} flexDirection="column">
        <Text color={HABIT_COLORS.secondary}>Category (Tab to cycle): </Text>
        <Box marginTop={1}>
          {categories.map((cat) => {
            const info = CATEGORY_INFO[cat];
            const isSelected = cat === category;
            return (
              <Box key={cat} marginRight={1}>
                <Text
                  color={isSelected ? info.color : HABIT_COLORS.muted}
                  bold={isSelected}
                >
                  {isSelected ? "[" : " "}
                  {cat}
                  {isSelected ? "]" : " "}
                </Text>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Description input */}
      <Box marginBottom={1}>
        <Text color={HABIT_COLORS.secondary}>Description: </Text>
        {focusField === "description" ? (
          <TextInput
            value={description}
            onChange={setDescription}
            placeholder="Optional description..."
          />
        ) : (
          <Text color={HABIT_COLORS.muted}>
            {description || "(press Enter to add)"}
          </Text>
        )}
      </Box>

      <Box>
        <Text color={HABIT_COLORS.muted}>
          Tab category | Enter next/save | Ctrl+S save | Esc cancel
        </Text>
      </Box>
    </Box>
  );
}

// Delete confirmation
function DeleteConfirmation({
  habit,
  onConfirm,
  onCancel,
}: {
  habit: Habit;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useInput((input, key) => {
    if (input.toLowerCase() === "y") {
      onConfirm();
    } else if (input.toLowerCase() === "n" || key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color={HABIT_COLORS.danger} bold>
        Delete "{habit.name}"?
      </Text>
      <Text color={HABIT_COLORS.muted}>
        This will delete all completion history.
      </Text>
      <Text color={HABIT_COLORS.muted}>
        Press Y to confirm, N or Esc to cancel
      </Text>
    </Box>
  );
}

// Week header component
function WeekHeader({
  weekStart,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
}: {
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
}) {
  const weekDates = getWeekDates(weekStart);
  const currentWeekStart = getWeekStart();
  const isCurrentWeek =
    weekStart.toISOString().split("T")[0] ===
    currentWeekStart.toISOString().split("T")[0];

  // Format week range
  const startStr = weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 6);
  const endStr = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={HABIT_COLORS.secondary} bold>
          {"[ WEEK VIEW ]"}
        </Text>
        <Box>
          <Text color={HABIT_COLORS.muted}>{"< "}</Text>
          <Text color={HABIT_COLORS.accent}>
            {startStr} - {endStr}
          </Text>
          <Text color={HABIT_COLORS.muted}>{" >"}</Text>
          {!isCurrentWeek && (
            <Text color={HABIT_COLORS.warning}> (t = today)</Text>
          )}
        </Box>
      </Box>

      {/* Day headers */}
      <Box flexDirection="row" marginTop={1}>
        <Box width={25}>
          <Text color={HABIT_COLORS.muted}>Habit</Text>
        </Box>
        {weekDates.map((date, i) => {
          const dayKey = getDateKey(date);
          const isTodayDate = isToday(date);
          const isFutureDate = isFuture(date);

          return (
            <Box key={dayKey} width={5} justifyContent="center">
              <Text
                color={
                  isTodayDate
                    ? HABIT_COLORS.accent
                    : isFutureDate
                      ? HABIT_COLORS.muted
                      : "white"
                }
                bold={isTodayDate}
              >
                {WEEKDAYS[i]}
              </Text>
            </Box>
          );
        })}
        <Box width={8} justifyContent="center">
          <Text color={HABIT_COLORS.muted}>Streak</Text>
        </Box>
        <Box width={6} justifyContent="center">
          <Text color={HABIT_COLORS.muted}>%</Text>
        </Box>
      </Box>
    </Box>
  );
}

// Habit row component
function HabitRow({
  habit,
  isSelected,
  weekStart,
  width,
}: {
  habit: Habit;
  isSelected: boolean;
  weekStart: Date;
  width: number;
}) {
  const weekDates = getWeekDates(weekStart);
  const streak = calculateStreak(habit);
  const weeklyPercent = calculateWeeklyCompletion(habit);
  const categoryInfo = CATEGORY_INFO[habit.category];

  return (
    <Box flexDirection="row">
      {/* Selection indicator + name */}
      <Box width={25}>
        <Text color={isSelected ? HABIT_COLORS.accent : HABIT_COLORS.muted}>
          {isSelected ? "> " : "  "}
        </Text>
        <Text color={categoryInfo.color}>[{categoryInfo.icon}]</Text>
        <Text
          color={isSelected ? HABIT_COLORS.primary : "white"}
          bold={isSelected}
        >
          {" "}
          {habit.name.slice(0, 18)}
        </Text>
      </Box>

      {/* Week completion grid */}
      {weekDates.map((date) => {
        const dateKey = getDateKey(date);
        const completed = isCompleted(habit, date);
        const isTodayDate = isToday(date);
        const isFutureDate = isFuture(date);

        let symbol: string;
        let color: string;

        if (isFutureDate) {
          symbol = "-";
          color = HABIT_COLORS.future;
        } else if (completed) {
          symbol = "X";
          color = HABIT_COLORS.done;
        } else {
          symbol = "O";
          color = HABIT_COLORS.missed;
        }

        return (
          <Box key={dateKey} width={5} justifyContent="center">
            <Text
              color={color}
              bold={isTodayDate}
              inverse={isTodayDate && isSelected}
            >
              {symbol}
            </Text>
          </Box>
        );
      })}

      {/* Streak */}
      <Box width={8} justifyContent="center">
        <Text color={streak > 0 ? HABIT_COLORS.warning : HABIT_COLORS.muted}>
          {streak > 0 ? `${streak}d` : "-"}
        </Text>
      </Box>

      {/* Weekly percentage */}
      <Box width={6} justifyContent="center">
        <Text
          color={
            weeklyPercent >= 80
              ? HABIT_COLORS.success
              : weeklyPercent >= 50
                ? HABIT_COLORS.warning
                : HABIT_COLORS.danger
          }
        >
          {weeklyPercent}%
        </Text>
      </Box>
    </Box>
  );
}

// Stats panel component
function StatsPanel({ habits, width }: { habits: Habit[]; width: number }) {
  const todayKey = getDateKey(new Date());
  const completedToday = habits.filter((h) => h.completions[todayKey]).length;
  const totalHabits = habits.length;

  // Calculate overall stats
  let totalStreak = 0;
  let bestEverStreak = 0;
  for (const habit of habits) {
    const streak = calculateStreak(habit);
    totalStreak += streak;
    bestEverStreak = Math.max(bestEverStreak, getBestStreak(habit));
  }

  const avgStreak = totalHabits > 0 ? Math.round(totalStreak / totalHabits) : 0;

  // Category breakdown
  const byCategory: Record<string, number> = {};
  for (const habit of habits) {
    byCategory[habit.category] = (byCategory[habit.category] || 0) + 1;
  }

  return (
    <Box flexDirection="column" width={width}>
      <Box marginBottom={1}>
        <Text color={HABIT_COLORS.secondary} bold>
          {"[ TODAY'S PROGRESS ]"}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={HABIT_COLORS.muted}
        paddingX={1}
      >
        {/* Today's completion */}
        <Box>
          <Text color={HABIT_COLORS.muted}>Completed: </Text>
          <Text
            color={
              completedToday === totalHabits
                ? HABIT_COLORS.success
                : HABIT_COLORS.warning
            }
            bold
          >
            {completedToday}/{totalHabits}
          </Text>
          {totalHabits > 0 && (
            <Text color={HABIT_COLORS.muted}>
              {" "}
              ({Math.round((completedToday / totalHabits) * 100)}%)
            </Text>
          )}
        </Box>

        {/* Streaks */}
        <Box marginTop={1}>
          <Text color={HABIT_COLORS.muted}>Avg streak: </Text>
          <Text color={HABIT_COLORS.accent}>{avgStreak}d</Text>
        </Box>
        <Box>
          <Text color={HABIT_COLORS.muted}>Best ever: </Text>
          <Text color={HABIT_COLORS.warning}>{bestEverStreak}d</Text>
        </Box>

        {/* Category breakdown */}
        {Object.keys(byCategory).length > 0 && (
          <Box marginTop={1} flexDirection="column">
            <Text color={HABIT_COLORS.muted}>By category:</Text>
            <Box flexWrap="wrap">
              {Object.entries(byCategory).map(([cat, count]) => {
                const info = CATEGORY_INFO[cat as HabitCategory];
                return (
                  <Box key={cat} marginRight={1}>
                    <Text color={info?.color || "gray"}>
                      {cat}: {count}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export function HabitsCanvas({
  id,
  config: initialConfig,
  socketPath,
  scenario = "habits",
}: Props) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Terminal dimensions
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns || 80,
    height: stdout?.rows || 24,
  });

  // Habits state
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);

  // Week navigation
  const [weekStart, setWeekStart] = useState(getWeekStart());

  // Save state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const filePath = initialConfig?.filePath || DEFAULT_HABITS_PATH;
  const autoSave = initialConfig?.autoSave !== false;

  // UI state
  const [showHelp, setShowHelp] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // IPC
  const ipc = useIPCServer({
    socketPath,
    scenario,
    onClose: () => exit(),
  });

  // Canvas navigation
  const handleNavigate = useCallback(
    (canvas: CanvasOption) => {
      // Save before navigating
      if (isDirty) {
        saveHabits(habits, filePath);
      }
      ipc.sendSelected({
        action: "navigate",
        canvas: canvas.kind,
      });
    },
    [ipc, isDirty, habits, filePath],
  );
  const { showNav, handleNavInput } = useCanvasNavigation(
    "habits",
    handleNavigate,
  );

  // Handle terminal resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: stdout?.columns || 80,
        height: stdout?.rows || 24,
      });
    };
    stdout?.on("resize", updateDimensions);
    updateDimensions();
    return () => {
      stdout?.off("resize", updateDimensions);
    };
  }, [stdout]);

  // Load habits on mount
  useEffect(() => {
    loadHabits(filePath).then((loaded) => {
      setHabits(loaded);
      setLastSaved(new Date());
    });
  }, [filePath]);

  // Auto-save when dirty
  useEffect(() => {
    if (autoSave && isDirty) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        saveHabits(habits, filePath).then(() => {
          setLastSaved(new Date());
          setIsDirty(false);
        });
      }, 1000); // Debounce 1 second
    }

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [autoSave, isDirty, habits, filePath]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (isDirty) {
        saveHabits(habits, filePath);
      }
    };
  }, [isDirty, habits, filePath]);

  // Create new habit
  const handleCreateHabit = useCallback(() => {
    setEditingHabit(null);
    setViewMode("create");
  }, []);

  // Edit habit
  const handleEditHabit = useCallback(() => {
    const habit = habits[selectedIndex];
    if (habit) {
      setEditingHabit(habit);
      setViewMode("edit");
    }
  }, [habits, selectedIndex]);

  // Save habit (create or edit)
  const handleSaveHabit = useCallback(
    (name: string, category: HabitCategory, description?: string) => {
      if (viewMode === "create") {
        const newHabit = createHabit(name, category, description);
        setHabits((prev) => [...prev, newHabit]);
      } else if (viewMode === "edit" && editingHabit) {
        setHabits((prev) =>
          prev.map((h) =>
            h.id === editingHabit.id
              ? { ...h, name, category, description }
              : h,
          ),
        );
      }
      setIsDirty(true);
      setViewMode("list");
      setEditingHabit(null);
    },
    [viewMode, editingHabit],
  );

  // Cancel form
  const handleCancelForm = useCallback(() => {
    setViewMode("list");
    setEditingHabit(null);
  }, []);

  // Request delete
  const handleRequestDelete = useCallback(() => {
    const habit = habits[selectedIndex];
    if (habit) {
      setDeleteTarget(habit);
    }
  }, [habits, selectedIndex]);

  // Confirm delete
  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget) {
      setHabits((prev) => prev.filter((h) => h.id !== deleteTarget.id));
      setIsDirty(true);
      setDeleteTarget(null);
      // Adjust selection
      if (selectedIndex >= habits.length - 1) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      }
    }
  }, [deleteTarget, habits.length, selectedIndex]);

  // Cancel delete
  const handleCancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  // Toggle today's completion
  const handleToggleToday = useCallback(() => {
    const habit = habits[selectedIndex];
    if (habit) {
      const updated = toggleCompletion(habit);
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? updated : h)));
      setIsDirty(true);
    }
  }, [habits, selectedIndex]);

  // Week navigation
  const handlePrevWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  const handleCurrentWeek = useCallback(() => {
    setWeekStart(getWeekStart());
  }, []);

  // Keyboard input
  useInput(
    (input, key) => {
      // Canvas navigation takes highest priority
      if (handleNavInput(input, key)) {
        return;
      }

      // Help overlay
      if (input === "?") {
        setShowHelp((h) => !h);
        return;
      }
      if (showHelp) {
        setShowHelp(false);
        return;
      }

      // Handle delete confirmation
      if (deleteTarget) {
        return; // Handled by DeleteConfirmation
      }

      // Handle form modes
      if (viewMode === "create" || viewMode === "edit") {
        return; // Handled by HabitForm
      }

      // Quit
      if (key.escape || input === "q") {
        if (isDirty) {
          saveHabits(habits, filePath);
        }
        const result: HabitsResult = {
          action: "save",
          habitsCount: habits.length,
          filePath,
        };
        ipc.sendSelected(result);
        exit();
        return;
      }

      // Navigation
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(habits.length - 1, i + 1));
      } else if (key.leftArrow) {
        handlePrevWeek();
      } else if (key.rightArrow) {
        handleNextWeek();
      } else if (input === "t") {
        handleCurrentWeek();
      }

      // Actions
      if (input === "n") {
        handleCreateHabit();
      } else if (input === "e") {
        handleEditHabit();
      } else if (input === "d") {
        handleRequestDelete();
      } else if (input === " " || key.return) {
        handleToggleToday();
      } else if (input === "r") {
        // Refresh - reload from file
        loadHabits(filePath).then((loaded) => {
          setHabits(loaded);
          setLastSaved(new Date());
          setIsDirty(false);
        });
      }
    },
    { isActive: viewMode === "list" && !deleteTarget && !showNav },
  );

  // Layout calculations
  const termWidth = dimensions.width;
  const termHeight = dimensions.height;
  const headerHeight = 3;
  const statusBarHeight = 2;
  const weekHeaderHeight = 4;
  const contentHeight =
    termHeight - headerHeight - statusBarHeight - weekHeaderHeight;
  const maxVisibleHabits = Math.max(1, contentHeight - 8);

  // Visible habits
  const visibleHabits = habits.slice(0, maxVisibleHabits);

  // Format save time
  const formatSaveTime = (date: Date | null): string => {
    if (!date) return "";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Header */}
      <Box
        justifyContent="center"
        paddingX={1}
        borderStyle="single"
        borderColor={HABIT_COLORS.accent}
      >
        <Text color={HABIT_COLORS.primary} bold>
          {"// HABITS //"}
        </Text>
      </Box>

      {/* Main content */}
      <Box flexDirection="column" height={contentHeight} paddingX={1}>
        {/* Delete confirmation */}
        {deleteTarget && (
          <DeleteConfirmation
            habit={deleteTarget}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />
        )}

        {/* Habit form */}
        {(viewMode === "create" || viewMode === "edit") && (
          <HabitForm
            habit={editingHabit}
            isNew={viewMode === "create"}
            onSave={handleSaveHabit}
            onCancel={handleCancelForm}
            width={Math.min(60, termWidth - 4)}
          />
        )}

        {/* List view */}
        {viewMode === "list" && !deleteTarget && (
          <Box flexDirection="row">
            {/* Habits list with week view */}
            <Box flexDirection="column" width="75%">
              <WeekHeader
                weekStart={weekStart}
                onPrevWeek={handlePrevWeek}
                onNextWeek={handleNextWeek}
                onCurrentWeek={handleCurrentWeek}
              />

              <Box
                flexDirection="column"
                borderStyle="single"
                borderColor={HABIT_COLORS.muted}
                paddingX={1}
              >
                {visibleHabits.length > 0 ? (
                  visibleHabits.map((habit, i) => (
                    <HabitRow
                      key={habit.id}
                      habit={habit}
                      isSelected={i === selectedIndex}
                      weekStart={weekStart}
                      width={Math.floor(termWidth * 0.7)}
                    />
                  ))
                ) : (
                  <Text color={HABIT_COLORS.muted}>
                    No habits yet. Press 'n' to create one.
                  </Text>
                )}
              </Box>

              {/* Legend */}
              <Box marginTop={1}>
                <Text color={HABIT_COLORS.done}>X=done</Text>
                <Text color={HABIT_COLORS.muted}> | </Text>
                <Text color={HABIT_COLORS.missed}>O=missed</Text>
                <Text color={HABIT_COLORS.muted}> | </Text>
                <Text color={HABIT_COLORS.future}>-=future</Text>
              </Box>
            </Box>

            {/* Stats panel */}
            <Box flexDirection="column" width="25%" paddingLeft={1}>
              <StatsPanel
                habits={habits}
                width={Math.floor(termWidth * 0.23)}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <Box paddingX={1} justifyContent="space-between">
        <Text color={HABIT_COLORS.muted}>
          Tab nav | ? help | n new | Space toggle | e edit | d delete |
          Left/Right week | q quit
        </Text>
        <Text color={HABIT_COLORS.muted}>
          {lastSaved
            ? `Saved ${formatSaveTime(lastSaved)}`
            : isDirty
              ? "Unsaved"
              : ""}
        </Text>
      </Box>

      {/* Help overlay */}
      {showHelp && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <HelpOverlay
            title="HABITS"
            bindings={HABITS_BINDINGS}
            visible={showHelp}
            width={Math.min(50, termWidth - 10)}
          />
        </Box>
      )}

      {/* Canvas navigator overlay */}
      {showNav && (
        <Box
          position="absolute"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width={termWidth}
          height={termHeight}
        >
          <CanvasNavigator
            visible={showNav}
            currentCanvas="habits"
            onSelect={handleNavigate}
            width={Math.min(55, termWidth - 10)}
          />
        </Box>
      )}
    </Box>
  );
}
