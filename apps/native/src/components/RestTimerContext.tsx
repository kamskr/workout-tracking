import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Vibration } from "react-native";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TimerStatus = "idle" | "running" | "paused" | "completed";

export interface TimerState {
  status: TimerStatus;
  /** Seconds remaining (0 when idle or completed). */
  remainingSeconds: number;
  /** The original duration the timer was started with. */
  configuredDuration: number;
  /** Name of the exercise the timer is running for. */
  exerciseName: string | null;
}

export interface TimerActions {
  /** Start (or restart) the timer for `seconds` on behalf of `exerciseName`. */
  startTimer: (seconds: number, exerciseName?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  /** Immediately dismiss the timer and return to idle. */
  skipTimer: () => void;
  /**
   * Shift the remaining time by `delta` seconds (positive = add, negative = remove).
   * Clamped so remaining never goes below 0 (completes immediately at 0).
   */
  adjustTimer: (delta: number) => void;
}

// ---------------------------------------------------------------------------
// Vibration helper (replaces Web Audio beep)
// ---------------------------------------------------------------------------

/**
 * Double vibration burst for timer completion.
 * Pattern: wait 0ms, vibrate 400ms, pause 200ms, vibrate 400ms.
 * Gracefully no-ops if Vibration is unavailable.
 */
function vibrateCompletion(): void {
  try {
    Vibration.vibrate([0, 400, 200, 400]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[RestTimer] Vibration failed (degraded gracefully):", err);
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const IDLE_STATE: TimerState = {
  status: "idle",
  remainingSeconds: 0,
  configuredDuration: 0,
  exerciseName: null,
};

const RestTimerContext = createContext<(TimerState & TimerActions) | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const TICK_MS = 100;
const AUTO_CLEAR_MS = 3_000;

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>(IDLE_STATE);

  // Mutable refs for interval math — avoids stale-closure issues (D032).
  const endTimeRef = useRef(0);
  const pausedRemainingRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configuredDurationRef = useRef(0);
  const exerciseNameRef = useRef<string | null>(null);

  // ---- helpers ----

  const clearTimers = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (autoClearRef.current !== null) {
      clearTimeout(autoClearRef.current);
      autoClearRef.current = null;
    }
  }, []);

  const completeTimer = useCallback(() => {
    clearTimers();
    vibrateCompletion();

    setState({
      status: "completed",
      remainingSeconds: 0,
      configuredDuration: configuredDurationRef.current,
      exerciseName: exerciseNameRef.current,
    });

    // Auto-clear to idle after a brief "Done!" display.
    autoClearRef.current = setTimeout(() => {
      setState(IDLE_STATE);
    }, AUTO_CLEAR_MS);
  }, [clearTimers]);

  const tick = useCallback(() => {
    const remaining = Math.max(
      0,
      Math.ceil((endTimeRef.current - Date.now()) / 1000),
    );

    if (remaining <= 0) {
      completeTimer();
      return;
    }

    setState((prev) => ({
      ...prev,
      status: "running",
      remainingSeconds: remaining,
    }));
  }, [completeTimer]);

  const startInterval = useCallback(() => {
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, TICK_MS);
    tick(); // immediate sync
  }, [tick]);

  // ---- actions ----

  const startTimer = useCallback(
    (seconds: number, exerciseName?: string) => {
      clearTimers();

      const clamped = Math.max(0, Math.round(seconds));
      if (clamped === 0) return; // nothing to time

      configuredDurationRef.current = clamped;
      exerciseNameRef.current = exerciseName ?? null;
      endTimeRef.current = Date.now() + clamped * 1000;

      setState({
        status: "running",
        remainingSeconds: clamped,
        configuredDuration: clamped,
        exerciseName: exerciseName ?? null,
      });

      startInterval();
    },
    [clearTimers, startInterval],
  );

  const pauseTimer = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "running") return prev;

      const remaining = Math.max(
        0,
        Math.ceil((endTimeRef.current - Date.now()) / 1000),
      );
      pausedRemainingRef.current = remaining;

      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      return { ...prev, status: "paused", remainingSeconds: remaining };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "paused") return prev;

      endTimeRef.current = Date.now() + pausedRemainingRef.current * 1000;
      startInterval();

      return { ...prev, status: "running" };
    });
  }, [startInterval]);

  const skipTimer = useCallback(() => {
    clearTimers();
    setState(IDLE_STATE);
  }, [clearTimers]);

  const adjustTimer = useCallback(
    (delta: number) => {
      setState((prev) => {
        if (prev.status === "idle" || prev.status === "completed") return prev;

        if (prev.status === "paused") {
          const newRemaining = Math.max(0, pausedRemainingRef.current + delta);
          pausedRemainingRef.current = newRemaining;

          if (newRemaining === 0) {
            completeTimer();
            return prev; // completeTimer sets state
          }

          return { ...prev, remainingSeconds: newRemaining };
        }

        // status === "running"
        endTimeRef.current += delta * 1000;
        const remaining = Math.max(
          0,
          Math.ceil((endTimeRef.current - Date.now()) / 1000),
        );

        if (remaining <= 0) {
          completeTimer();
          return prev;
        }

        return { ...prev, remainingSeconds: remaining };
      });
    },
    [completeTimer],
  );

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const value: TimerState & TimerActions = {
    ...state,
    startTimer,
    pauseTimer,
    resumeTimer,
    skipTimer,
    adjustTimer,
  };

  return (
    <RestTimerContext.Provider value={value}>
      {children}
    </RestTimerContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the rest timer state and actions.
 * Must be used within a `<RestTimerProvider>`.
 */
export function useRestTimer(): TimerState & TimerActions {
  const ctx = useContext(RestTimerContext);
  if (ctx === null) {
    throw new Error("useRestTimer must be used within a <RestTimerProvider>");
  }
  return ctx;
}
