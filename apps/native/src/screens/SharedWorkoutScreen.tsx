import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-expo";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import CloneButtonNative from "../components/social/CloneButtonNative";
import { colors, fontFamily, spacing } from "../lib/theme";
import { formatDuration } from "../lib/units";

// ── Route Params ─────────────────────────────────────────────────────────────

type SharedWorkoutParams = {
  SharedWorkout: {
    feedItemId: string;
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── SharedWorkoutScreen ─────────────────────────────────────────────────────

export default function SharedWorkoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route =
    useRoute<RouteProp<SharedWorkoutParams, "SharedWorkout">>();
  const { isSignedIn } = useUser();

  const feedItemId = route.params.feedItemId as Id<"feedItems">;

  const sharedWorkout = useQuery(
    api.sharing.getSharedWorkout,
    feedItemId ? { feedItemId } : "skip",
  );

  // Loading
  if (sharedWorkout === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <HeaderBar onBack={() => navigation.goBack()} title="" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading shared workout…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Workout not available
  if (sharedWorkout === null) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <HeaderBar onBack={() => navigation.goBack()} title="" />
        <View style={styles.centered}>
          <Ionicons
            name="close-circle-outline"
            size={40}
            color={colors.textPlaceholder}
          />
          <Text style={styles.emptyTitle}>Workout not available</Text>
          <Text style={styles.emptySubtitle}>
            This workout may be private, deleted, or the link may be invalid.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { workout, exercises, author, feedItem } = sharedWorkout;
  const prCount =
    feedItem.summary && "prCount" in feedItem.summary
      ? (feedItem.summary as { prCount?: number }).prCount ?? 0
      : 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar
        onBack={() => navigation.goBack()}
        title="Shared Workout"
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row: label + clone button */}
        <View style={styles.headerRow}>
          <Text style={styles.headerLabel}>SHARED WORKOUT</Text>
          {isSignedIn && (
            <CloneButtonNative
              feedItemId={feedItemId}
              workoutName={workout.name ?? "Cloned Workout"}
            />
          )}
        </View>

        {/* Author card */}
        <View style={styles.card}>
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              {author.avatarUrl ? (
                <Image
                  source={{ uri: author.avatarUrl }}
                  style={styles.avatarImage}
                  accessibilityLabel={author.displayName}
                />
              ) : (
                <Text style={styles.avatarInitials}>
                  {getInitials(author.displayName)}
                </Text>
              )}
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{author.displayName}</Text>
              <Text style={styles.authorUsername}>@{author.username}</Text>
            </View>
          </View>
        </View>

        {/* Workout summary card */}
        <View style={styles.card}>
          <Text style={styles.workoutName}>
            {workout.name ?? "Workout"}
          </Text>
          <View style={styles.summaryStats}>
            {workout.durationSeconds != null && (
              <View style={styles.statBadge}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.statText}>
                  {formatDuration(workout.durationSeconds)}
                </Text>
              </View>
            )}
            {workout.completedAt != null && (
              <Text style={styles.statText}>
                {formatDate(workout.completedAt)}
              </Text>
            )}
            <Text style={styles.statText}>
              {exercises.length} exercise
              {exercises.length !== 1 ? "s" : ""}
            </Text>
            {prCount > 0 && (
              <Text style={styles.prText}>
                🏆 {prCount} PR{prCount !== 1 ? "s" : ""}
              </Text>
            )}
          </View>
        </View>

        {/* Exercise list */}
        {exercises.map(({ workoutExercise, exercise, sets }) => (
          <View key={workoutExercise._id} style={styles.card}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>
                {exercise?.name ?? "Unknown Exercise"}
              </Text>
              <Text style={styles.setCount}>
                {sets.length} set{sets.length !== 1 ? "s" : ""}
              </Text>
            </View>

            {sets.length > 0 && (
              <View style={styles.setsContainer}>
                {/* Column headers */}
                <View style={styles.setRow}>
                  <Text style={[styles.setCell, styles.setCellHeader]}>
                    Set
                  </Text>
                  <Text style={[styles.setCell, styles.setCellHeader]}>
                    Weight
                  </Text>
                  <Text style={[styles.setCell, styles.setCellHeader]}>
                    Reps
                  </Text>
                </View>
                {sets.map((set) => (
                  <View key={set._id} style={styles.setRowData}>
                    <Text style={styles.setCell}>{set.setNumber}</Text>
                    <Text style={styles.setCell}>
                      {set.weight != null ? `${set.weight} kg` : "—"}
                    </Text>
                    <Text style={styles.setCell}>
                      {set.reps != null ? `${set.reps}` : "—"}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Header Bar ───────────────────────────────────────────────────────────────

function HeaderBar({
  onBack,
  title,
}: {
  onBack: () => void;
  title: string;
}) {
  return (
    <View style={headerStyles.row}>
      <TouchableOpacity
        onPress={onBack}
        style={headerStyles.backButton}
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={headerStyles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={headerStyles.backButton} />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const headerStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLabel: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.textPlaceholder,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  // Cards
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  // Author
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarInitials: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  authorUsername: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  // Workout summary
  workoutName: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  summaryStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginTop: spacing.sm,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  prText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: "#D97706",
  },
  // Exercise cards
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exerciseName: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    flex: 1,
  },
  setCount: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textPlaceholder,
  },
  setsContainer: {
    marginTop: spacing.sm,
    gap: 4,
  },
  setRow: {
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  setRowData: {
    flexDirection: "row",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  setCell: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.text,
    textAlign: "left",
    paddingHorizontal: 4,
  },
  setCellHeader: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.textPlaceholder,
    marginBottom: 4,
  },
});
