import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamily, spacing } from "../../lib/theme";
import { formatWeight, formatDuration } from "../../lib/units";

// ---------------------------------------------------------------------------
// Deterministic card colors (same hash algorithm as web, 8 RN pairs)
// ---------------------------------------------------------------------------

const CARD_COLORS: { border: string; bg: string }[] = [
  { border: "#BFDBFE", bg: "#EFF6FF" }, // blue
  { border: "#A7F3D0", bg: "#ECFDF5" }, // green
  { border: "#DDD6FE", bg: "#F5F3FF" }, // purple
  { border: "#FDE68A", bg: "#FFFBEB" }, // amber
  { border: "#FBCFE8", bg: "#FDF2F8" }, // pink
  { border: "#99F6E4", bg: "#F0FDFA" }, // teal
  { border: "#FECACA", bg: "#FEF2F2" }, // red
  { border: "#C7D2FE", bg: "#EEF2FF" }, // indigo
];

function cardColor(userId: string): { border: string; bg: string } {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

// ---------------------------------------------------------------------------
// Stat item helper
// ---------------------------------------------------------------------------

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionSummaryNativeProps {
  sessionId: Id<"groupSessions">;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SessionSummaryNative({
  sessionId,
}: SessionSummaryNativeProps) {
  const summary = useQuery(api.sessions.getSessionSummary, { sessionId });

  // Loading state
  if (summary === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Loading summary…</Text>
      </View>
    );
  }

  const completedTime = summary.completedAt
    ? new Date(summary.completedAt).toLocaleString()
    : "In progress";

  const totalParticipants = summary.participantSummaries.length;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* ── Summary header ────────────────────────────────────────────── */}
      <View style={styles.headerCard}>
        <View style={styles.checkmarkCircle}>
          <Ionicons
            name="checkmark-circle-outline"
            size={32}
            color={colors.success}
          />
        </View>
        <Text style={styles.headerTitle}>Session Complete!</Text>
        <Text style={styles.headerSubtitle}>
          {completedTime} · {totalParticipants} participant
          {totalParticipants !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* ── Per-participant cards ──────────────────────────────────────── */}
      {summary.participantSummaries.map((p) => {
        const colorPair = cardColor(p.userId);
        return (
          <View
            key={p.userId}
            style={[
              styles.participantCard,
              {
                borderColor: colorPair.border,
                backgroundColor: colorPair.bg,
              },
            ]}
          >
            <Text style={styles.participantName} numberOfLines={1}>
              {p.displayName}
            </Text>
            <View style={styles.statsGrid}>
              <StatItem
                label="Exercises"
                value={String(p.exerciseCount)}
              />
              <StatItem label="Sets" value={String(p.setCount)} />
              <StatItem
                label="Volume"
                value={formatWeight(p.totalVolume, "kg")}
              />
              <StatItem
                label="Duration"
                value={formatDuration(p.durationSeconds)}
              />
            </View>
          </View>
        );
      })}

      {/* Empty state if no participants */}
      {totalParticipants === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No workout data was recorded for this session.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  scrollContent: {
    gap: spacing.md,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  checkmarkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#D1FAE5", // green-100
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  participantCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  participantName: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statItem: {
    width: "50%",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
});
