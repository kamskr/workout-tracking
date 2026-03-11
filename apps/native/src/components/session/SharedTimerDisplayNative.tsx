import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from "react-native";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamily, spacing } from "../../lib/theme";
import { formatRestTime } from "../../lib/units";
import PillSelectorNative from "../competitive/PillSelectorNative";

// ---------------------------------------------------------------------------
// View-based circular progress ring (no SVG dependency — matches D042)
// Reuses the pattern from RestTimerDisplay.tsx
// ---------------------------------------------------------------------------

const RING_SIZE = 120;
const STROKE_WIDTH = 6;

type RingStatus = "idle" | "running" | "done";

function getProgressColor(status: RingStatus): string {
  switch (status) {
    case "done":
      return colors.success;
    case "running":
      return colors.accent;
    default:
      return colors.border;
  }
}

function ProgressRing({
  remaining,
  total,
  status,
}: {
  remaining: number;
  total: number;
  status: RingStatus;
}) {
  const progress = total > 0 ? remaining / total : 0;
  const progressColor = getProgressColor(status);
  const trackColor = colors.backgroundSecondary;
  const innerSize = RING_SIZE - STROKE_WIDTH * 2;
  const degrees = progress * 360;

  return (
    <View style={ringStyles.container}>
      {/* Background track */}
      <View style={[ringStyles.track, { borderColor: trackColor }]} />

      {/* Right half (0°–180°) */}
      <View style={ringStyles.halfContainer}>
        <View style={ringStyles.halfClip}>
          <View
            style={[
              ringStyles.halfCircle,
              {
                borderColor: progressColor,
                transform: [{ rotate: `${Math.min(degrees, 180)}deg` }],
              },
            ]}
          />
        </View>
      </View>

      {/* Left half (180°–360°) */}
      {degrees > 180 && (
        <View
          style={[
            ringStyles.halfContainer,
            { transform: [{ rotate: "180deg" }] },
          ]}
        >
          <View style={ringStyles.halfClip}>
            <View
              style={[
                ringStyles.halfCircle,
                {
                  borderColor: progressColor,
                  transform: [{ rotate: `${degrees - 180}deg` }],
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Inner white circle to create ring effect */}
      <View
        style={[
          ringStyles.inner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          },
        ]}
      />
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: STROKE_WIDTH,
  },
  halfContainer: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    overflow: "hidden",
  },
  halfClip: {
    position: "absolute",
    width: RING_SIZE / 2,
    height: RING_SIZE,
    right: 0,
    overflow: "hidden",
  },
  halfCircle: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: STROKE_WIDTH,
    borderColor: "transparent",
    position: "absolute",
    right: 0,
  },
  inner: {
    backgroundColor: colors.background,
    position: "absolute",
  },
});

// ---------------------------------------------------------------------------
// Duration presets for PillSelectorNative
// ---------------------------------------------------------------------------

type DurationValue = "30" | "60" | "90" | "120";

const DURATION_PRESETS: { label: string; value: DurationValue }[] = [
  { label: "30s", value: "30" },
  { label: "60s", value: "60" },
  { label: "90s", value: "90" },
  { label: "120s", value: "120" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SharedTimerDisplayNativeProps {
  session: {
    sharedTimerEndAt?: number;
    sharedTimerDurationSeconds?: number;
    status: string;
  };
  sessionId: Id<"groupSessions">;
}

// ---------------------------------------------------------------------------
// Grace window: after timer hits 0, show "Done!" for 3 seconds before idle
// ---------------------------------------------------------------------------

const DONE_GRACE_MS = 3000;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SharedTimerDisplayNative({
  session,
  sessionId,
}: SharedTimerDisplayNativeProps) {
  const startTimer = useMutation(api.sessions.startSharedTimer);
  const pauseTimer = useMutation(api.sessions.pauseSharedTimer);
  const skipTimer = useMutation(api.sessions.skipSharedTimer);

  // Selected duration for the next timer start
  const [selectedDuration, setSelectedDuration] = useState<DurationValue>(
    String(session.sharedTimerDurationSeconds ?? 60) as DurationValue,
  );

  // Local countdown state updated by setInterval
  const [remaining, setRemaining] = useState(0);

  // "Done!" animation state — tracks when the timer just finished
  const [showDone, setShowDone] = useState(false);
  const doneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track whether we've already vibrated for the current timer completion
  const hasVibratedRef = useRef(false);

  // Derive timer state from session props
  const endAt = session.sharedTimerEndAt;
  const totalDuration = session.sharedTimerDurationSeconds ?? 0;
  const isRunning = endAt != null && endAt > Date.now();

  // Countdown effect: 100ms interval ONLY when timer is running (battery optimization)
  useEffect(() => {
    if (!isRunning || !endAt) {
      return;
    }

    // Reset vibration flag when a new timer starts
    hasVibratedRef.current = false;

    const computeRemaining = () =>
      Math.max(0, Math.ceil((endAt - Date.now()) / 1000));

    setRemaining(computeRemaining());
    setShowDone(false);

    const interval = setInterval(() => {
      const r = computeRemaining();
      setRemaining(r);

      if (r <= 0) {
        clearInterval(interval);

        // Vibrate on timer completion (D039)
        if (!hasVibratedRef.current) {
          hasVibratedRef.current = true;
          Vibration.vibrate();
        }

        // Show "Done!" for the grace period
        setShowDone(true);
        if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
        doneTimeoutRef.current = setTimeout(
          () => setShowDone(false),
          DONE_GRACE_MS,
        );
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [endAt, isRunning]);

  // Cleanup done timeout on unmount
  useEffect(() => {
    return () => {
      if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
    };
  }, []);

  // Update selectedDuration when session duration changes
  useEffect(() => {
    if (session.sharedTimerDurationSeconds) {
      setSelectedDuration(
        String(session.sharedTimerDurationSeconds) as DurationValue,
      );
    }
  }, [session.sharedTimerDurationSeconds]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    try {
      await startTimer({
        sessionId,
        durationSeconds: Number(selectedDuration),
      });
    } catch (err) {
      console.error("[Session] Timer start failed:", err);
    }
  }, [startTimer, sessionId, selectedDuration]);

  const handlePause = useCallback(async () => {
    try {
      await pauseTimer({ sessionId });
    } catch (err) {
      console.error("[Session] Timer pause failed:", err);
    }
  }, [pauseTimer, sessionId]);

  const handleSkip = useCallback(async () => {
    try {
      await skipTimer({ sessionId });
    } catch (err) {
      console.error("[Session] Timer skip failed:", err);
    }
  }, [skipTimer, sessionId]);

  // Don't render for completed sessions
  if (session.status === "completed") {
    return null;
  }

  // ── Determine visual state ───────────────────────────────────────────────

  const timerState: RingStatus =
    isRunning && remaining > 0
      ? "running"
      : showDone
        ? "done"
        : "idle";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Ionicons name="timer-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.headerText}>Shared Rest Timer</Text>
      </View>

      {/* ── Running / Done state ──────────────────────────────────────── */}
      {(timerState === "running" || timerState === "done") && (
        <View style={styles.centerContent}>
          {/* Ring + center content */}
          <View style={styles.ringWrapper}>
            <ProgressRing
              remaining={remaining}
              total={totalDuration}
              status={timerState}
            />
            <View style={styles.ringCenter}>
              {timerState === "done" ? (
                <Ionicons
                  name="checkmark-circle"
                  size={36}
                  color={colors.success}
                />
              ) : (
                <Text style={styles.timeText}>
                  {formatRestTime(remaining)}
                </Text>
              )}
            </View>
          </View>

          {timerState === "done" && (
            <Text style={styles.doneText}>Done!</Text>
          )}

          {/* Controls while running */}
          {timerState === "running" && (
            <View style={styles.controls}>
              <TouchableOpacity
                onPress={handlePause}
                style={styles.controlButton}
                accessibilityLabel="Pause timer"
                accessibilityRole="button"
              >
                <Ionicons name="pause" size={16} color={colors.text} />
                <Text style={styles.controlButtonText}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSkip}
                style={[styles.controlButton, styles.controlButtonDanger]}
                accessibilityLabel="Skip timer"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={16} color={colors.destructive} />
                <Text
                  style={[
                    styles.controlButtonText,
                    { color: colors.destructive },
                  ]}
                >
                  Skip
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── Idle state: duration presets + start ──────────────────────── */}
      {timerState === "idle" && (
        <View style={styles.centerContent}>
          {/* Duration presets via PillSelectorNative */}
          <PillSelectorNative<DurationValue>
            options={DURATION_PRESETS}
            selected={selectedDuration}
            onSelect={setSelectedDuration}
          />

          {/* Start button */}
          <TouchableOpacity
            onPress={handleStart}
            style={styles.startButton}
            accessibilityLabel="Start Timer"
            accessibilityRole="button"
          >
            <Ionicons name="timer-outline" size={18} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Start Timer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  centerContent: {
    alignItems: "center",
  },
  ringWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontSize: 24,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  doneText: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.success,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
  },
  controlButtonDanger: {
    backgroundColor: "#FEE2E2",
  },
  controlButtonText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    backgroundColor: colors.accent,
    marginTop: spacing.md,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonText: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: "#FFFFFF",
  },
});
