import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamily, spacing } from "../lib/theme";
import type { CompeteStackParamList } from "../navigation/MainTabs";

// ── Types ────────────────────────────────────────────────────────────────────

type ChallengeType = "totalReps" | "totalVolume" | "workoutCount" | "maxWeight";
type ChallengeStatus = "pending" | "active" | "completed" | "cancelled";

type ChallengeDetailRoute = RouteProp<CompeteStackParamList, "ChallengeDetail">;

const TYPE_LABELS: Record<ChallengeType, string> = {
  totalReps: "Total Reps",
  totalVolume: "Total Volume",
  workoutCount: "Workout Count",
  maxWeight: "Max Weight",
};

const TYPE_BADGE_COLORS: Record<ChallengeType, { bg: string; text: string }> = {
  totalReps: { bg: "#F3E8FF", text: "#7C3AED" },
  totalVolume: { bg: "#D1FAE5", text: "#059669" },
  workoutCount: { bg: "#DBEAFE", text: "#2563EB" },
  maxWeight: { bg: "#FFEDD5", text: "#EA580C" },
};

const STATUS_BADGE_COLORS: Record<
  ChallengeStatus,
  { bg: string; text: string }
> = {
  pending: { bg: "#FEF3C7", text: "#D97706" },
  active: { bg: "#D1FAE5", text: "#059669" },
  completed: { bg: "#F3F4F6", text: "#6B7280" },
  cancelled: { bg: "#FEE2E2", text: "#DC2626" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeRemaining(endAt: number): string {
  const diff = endAt - Date.now();
  if (diff <= 0) return "Ended";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatScore(value: number, type: ChallengeType): string {
  switch (type) {
    case "totalReps":
      return `${value} reps`;
    case "totalVolume":
      return `${Math.round(value * 10) / 10} kg`;
    case "workoutCount":
      return `${value} workouts`;
    case "maxWeight":
      return `${Math.round(value * 10) / 10} kg`;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ChallengeDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<ChallengeDetailRoute>();
  const { challengeId } = route.params;
  const { user } = useUser();
  const currentUserId = user?.id;

  // ── Mutations ────────────────────────────────────────────────────────────
  const joinChallenge = useMutation(api.challenges.joinChallenge);
  const leaveChallenge = useMutation(api.challenges.leaveChallenge);
  const cancelChallenge = useMutation(api.challenges.cancelChallenge);

  const [isActioning, setIsActioning] = useState(false);

  // ── Query ────────────────────────────────────────────────────────────────
  const standings = useQuery(
    api.challenges.getChallengeStandings,
    challengeId
      ? { challengeId: challengeId as Id<"challenges"> }
      : "skip",
  );

  // ── Derived state ────────────────────────────────────────────────────────
  const challenge = standings?.challenge;
  const participants = standings?.participants;

  const isParticipant =
    currentUserId && participants
      ? participants.some((p) => p.userId === currentUserId)
      : false;

  const isCreator =
    currentUserId && challenge ? challenge.creatorId === currentUserId : false;

  const canJoin =
    !isParticipant &&
    challenge &&
    (challenge.status === "pending" || challenge.status === "active");

  const canLeave = isParticipant && !isCreator;

  const canCancel =
    isCreator &&
    challenge &&
    (challenge.status === "pending" || challenge.status === "active");

  // ── Action handlers ──────────────────────────────────────────────────────
  const handleJoin = useCallback(async () => {
    setIsActioning(true);
    try {
      await joinChallenge({
        challengeId: challengeId as Id<"challenges">,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join challenge";
      console.error("[ChallengeDetail] joinChallenge failed:", message);
      Alert.alert("Error", message);
    } finally {
      setIsActioning(false);
    }
  }, [challengeId, joinChallenge]);

  const handleLeave = useCallback(async () => {
    setIsActioning(true);
    try {
      await leaveChallenge({
        challengeId: challengeId as Id<"challenges">,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to leave challenge";
      console.error("[ChallengeDetail] leaveChallenge failed:", message);
      Alert.alert("Error", message);
    } finally {
      setIsActioning(false);
    }
  }, [challengeId, leaveChallenge]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      "Cancel Challenge",
      "Are you sure you want to cancel this challenge? This cannot be undone.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Challenge",
          style: "destructive",
          onPress: async () => {
            setIsActioning(true);
            try {
              await cancelChallenge({
                challengeId: challengeId as Id<"challenges">,
              });
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to cancel challenge";
              console.error(
                "[ChallengeDetail] cancelChallenge failed:",
                message,
              );
              Alert.alert("Error", message);
            } finally {
              setIsActioning(false);
            }
          },
        },
      ],
    );
  }, [challengeId, cancelChallenge]);

  // ── Render standings row ─────────────────────────────────────────────────
  const renderStandingRow = useCallback(
    ({
      item,
      index,
    }: {
      item: (typeof participants)[number];
      index: number;
    }) => {
      const isCurrentUser = currentUserId === item.userId;
      const isCompleted = challenge?.status === "completed";
      const isWinner = isCompleted && index === 0;

      return (
        <View
          style={[
            styles.standingRow,
            isCurrentUser && styles.standingRowHighlighted,
          ]}
        >
          {/* Rank */}
          <View style={styles.rankContainer}>
            {isWinner ? (
              <Text style={styles.winnerCrown}>👑</Text>
            ) : (
              <Text
                style={[
                  styles.rankText,
                  isCurrentUser && styles.rankTextHighlighted,
                ]}
              >
                {index + 1}
              </Text>
            )}
          </View>

          {/* User info */}
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {item.displayName}
              </Text>
              {isCurrentUser && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>You</Text>
                </View>
              )}
            </View>
            <Text style={styles.username} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>

          {/* Score */}
          <Text
            style={[
              styles.scoreText,
              isCurrentUser && styles.scoreTextHighlighted,
            ]}
          >
            {challenge
              ? formatScore(
                  item.currentValue,
                  challenge.type as ChallengeType,
                )
              : String(item.currentValue)}
          </Text>
        </View>
      );
    },
    [currentUserId, challenge],
  );

  // ── Loading state ────────────────────────────────────────────────────────
  if (standings === undefined) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.textSecondary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Challenge not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const typeBadge = TYPE_BADGE_COLORS[challenge.type as ChallengeType];
  const statusBadge =
    STATUS_BADGE_COLORS[challenge.status as ChallengeStatus];
  const isActive =
    challenge.status === "active" || challenge.status === "pending";

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={participants ?? []}
        renderItem={renderStandingRow as any}
        keyExtractor={(item: any) => item._id ?? item.userId}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Challenge Info */}
            <Text style={styles.challengeTitle}>{challenge.title}</Text>

            <View style={styles.badgeRow}>
              <View
                style={[styles.badge, { backgroundColor: typeBadge?.bg }]}
              >
                <Text style={[styles.badgeText, { color: typeBadge?.text }]}>
                  {TYPE_LABELS[challenge.type as ChallengeType]}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: statusBadge?.bg },
                ]}
              >
                <Text
                  style={[styles.badgeText, { color: statusBadge?.text }]}
                >
                  {(challenge.status as string).charAt(0).toUpperCase() +
                    (challenge.status as string).slice(1)}
                </Text>
              </View>
            </View>

            {isActive ? (
              <Text style={styles.timeInfo}>
                {formatTimeRemaining(challenge.endAt)}
              </Text>
            ) : challenge.status === "completed" ? (
              <Text style={styles.timeInfo}>
                Completed {formatDate(challenge.completedAt ?? challenge.endAt)}
              </Text>
            ) : null}

            {challenge.description ? (
              <Text style={styles.description}>{challenge.description}</Text>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              {canJoin && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleJoin}
                  disabled={isActioning}
                  activeOpacity={0.7}
                >
                  {isActioning ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="enter-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.actionButtonText}>Join</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {canLeave && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={handleLeave}
                  disabled={isActioning}
                  activeOpacity={0.7}
                >
                  {isActioning ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <>
                      <Ionicons
                        name="exit-outline"
                        size={18}
                        color={colors.accent}
                      />
                      <Text style={styles.actionButtonTextSecondary}>
                        Leave
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {canCancel && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonDestructive]}
                  onPress={handleCancel}
                  disabled={isActioning}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={colors.destructive}
                  />
                  <Text style={styles.actionButtonTextDestructive}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Standings Header */}
            <Text style={styles.standingsTitle}>Standings</Text>
            {participants && participants.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No participants yet.</Text>
              </View>
            )}
          </>
        }
        ListFooterComponent={<View style={styles.bottomSpacer} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  backText: {
    fontSize: 16,
    fontFamily: fontFamily.regular,
    color: colors.accent,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },

  // Challenge Info
  challengeTitle: {
    fontSize: 24,
    fontFamily: fontFamily.bold,
    color: colors.text,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
  },
  timeInfo: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  // Action Buttons
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  actionButtonDestructive: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: "#FFFFFF",
  },
  actionButtonTextSecondary: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.accent,
  },
  actionButtonTextDestructive: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.destructive,
  },

  // Standings
  standingsTitle: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  standingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  standingRowHighlighted: {
    backgroundColor: `${colors.accent}10`,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
  },
  rankContainer: {
    width: 32,
    alignItems: "center",
  },
  rankText: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  rankTextHighlighted: {
    color: colors.accent,
  },
  winnerCrown: {
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  displayName: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  youBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: "#FFFFFF",
  },
  username: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 1,
  },
  scoreText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  scoreTextHighlighted: {
    color: colors.accent,
    fontFamily: fontFamily.bold,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Empty
  emptyBox: {
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },

  bottomSpacer: {
    height: spacing.xl,
  },
});
