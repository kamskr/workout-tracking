import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatRestTime } from "../lib/units";
import { colors, fontFamily, spacing } from "../lib/theme";
import { useRestTimer, type TimerStatus } from "./RestTimerContext";

// ---------------------------------------------------------------------------
// Circular progress ring (View-based, no SVG dependency)
// ---------------------------------------------------------------------------

const RING_SIZE = 100;
const STROKE_WIDTH = 6;

function getProgressColor(status: TimerStatus): string {
  switch (status) {
    case "paused":
      return "#F59E0B"; // amber
    case "completed":
      return colors.success;
    default:
      return colors.accent;
  }
}

/**
 * Simple circular progress using two half-circle overlays.
 * Shows progress from 100% → 0% as timer counts down.
 */
function ProgressRing({
  remaining,
  total,
  status,
}: {
  remaining: number;
  total: number;
  status: TimerStatus;
}) {
  const progress = total > 0 ? remaining / total : 0;
  const progressColor = getProgressColor(status);
  const trackColor = colors.backgroundSecondary;
  const innerSize = RING_SIZE - STROKE_WIDTH * 2;

  // Convert progress (0–1) to degrees (0–360)
  const degrees = progress * 360;

  return (
    <View style={ringStyles.container}>
      {/* Background track */}
      <View
        style={[
          ringStyles.track,
          { borderColor: trackColor },
        ]}
      />

      {/* Right half (0°–180°) */}
      <View style={ringStyles.halfContainer}>
        <View style={ringStyles.halfClip}>
          <View
            style={[
              ringStyles.halfCircle,
              {
                borderColor: progressColor,
                transform: [
                  { rotate: `${Math.min(degrees, 180)}deg` },
                ],
              },
            ]}
          />
        </View>
      </View>

      {/* Left half (180°–360°) */}
      {degrees > 180 && (
        <View style={[ringStyles.halfContainer, { transform: [{ rotate: "180deg" }] }]}>
          <View style={ringStyles.halfClip}>
            <View
              style={[
                ringStyles.halfCircle,
                {
                  borderColor: progressColor,
                  transform: [
                    { rotate: `${degrees - 180}deg` },
                  ],
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Inner white circle to create ring effect */}
      <View style={[ringStyles.inner, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]} />
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
// Control button
// ---------------------------------------------------------------------------

function ControlButton({
  onPress,
  label,
  children,
  variant = "default",
}: {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
  variant?: "default" | "danger";
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={[
        styles.controlButton,
        variant === "danger" && styles.controlButtonDanger,
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {children}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main component — floating overlay at bottom of screen
// ---------------------------------------------------------------------------

export default function RestTimerDisplay() {
  const {
    status,
    remainingSeconds,
    configuredDuration,
    exerciseName,
    pauseTimer,
    resumeTimer,
    skipTimer,
    adjustTimer,
  } = useRestTimer();

  // Slide-in / fade animation
  const slideAnim = useRef(new Animated.Value(80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status !== "idle") {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 80,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [status, slideAnim, opacityAnim]);

  if (status === "idle") return null;

  const isCompleted = status === "completed";

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      accessibilityLabel={
        isCompleted
          ? "Rest timer completed"
          : `Rest timer: ${formatRestTime(remainingSeconds)} remaining`
      }
      accessibilityRole="timer"
    >
      {/* Ring + center content */}
      <View style={styles.ringWrapper}>
        <ProgressRing
          remaining={remainingSeconds}
          total={configuredDuration}
          status={status}
        />
        {/* Overlay center content */}
        <View style={styles.ringCenter}>
          {isCompleted ? (
            <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          ) : (
            <Text style={styles.timeText}>
              {formatRestTime(remainingSeconds)}
            </Text>
          )}
        </View>
      </View>

      {/* Exercise name */}
      {exerciseName && !isCompleted && (
        <Text style={styles.exerciseName} numberOfLines={1}>
          {exerciseName}
        </Text>
      )}

      {/* Completed banner */}
      {isCompleted && <Text style={styles.doneText}>Done!</Text>}

      {/* Controls — running */}
      {status === "running" && (
        <View style={styles.controls}>
          <ControlButton
            onPress={() => adjustTimer(-15)}
            label="Subtract 15 seconds"
          >
            <Text style={styles.adjustText}>−15s</Text>
          </ControlButton>
          <ControlButton onPress={pauseTimer} label="Pause timer">
            <Ionicons name="pause" size={16} color={colors.text} />
          </ControlButton>
          <ControlButton onPress={skipTimer} label="Skip timer" variant="danger">
            <Ionicons name="close" size={16} color={colors.destructive} />
          </ControlButton>
          <ControlButton
            onPress={() => adjustTimer(15)}
            label="Add 15 seconds"
          >
            <Text style={styles.adjustText}>+15s</Text>
          </ControlButton>
        </View>
      )}

      {/* Controls — paused */}
      {status === "paused" && (
        <View style={styles.controls}>
          <ControlButton onPress={resumeTimer} label="Resume timer">
            <Ionicons name="play" size={16} color={colors.text} />
          </ControlButton>
          <ControlButton onPress={skipTimer} label="Skip timer" variant="danger">
            <Ionicons name="close" size={16} color={colors.destructive} />
          </ControlButton>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    bottom: 90, // above tab bar
    right: spacing.md,
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    // Shadow / elevation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    zIndex: 100,
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
    fontSize: 22,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  exerciseName: {
    marginTop: spacing.xs,
    maxWidth: 130,
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
  doneText: {
    marginTop: spacing.xs,
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.success,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  controlButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.backgroundSecondary,
  },
  controlButtonDanger: {
    backgroundColor: "#FEE2E2",
  },
  adjustText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
});
