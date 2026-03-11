import React, { useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import PillSelectorNative from "../components/competitive/PillSelectorNative";
import { colors, fontFamily, spacing } from "../lib/theme";
import type { CompeteStackParamList } from "../navigation/MainTabs";

// ── Types ────────────────────────────────────────────────────────────────────

type ChallengeType = "totalReps" | "totalVolume" | "workoutCount" | "maxWeight";
type ChallengeStatus = "pending" | "active" | "completed" | "cancelled";
type StatusFilter = "active" | "completed" | "my";

type ChallengesNav = NativeStackNavigationProp<CompeteStackParamList>;

interface ChallengeListItem {
  _id: Id<"challenges">;
  _creationTime: number;
  creatorId: string;
  title: string;
  description?: string;
  type: ChallengeType;
  exerciseId?: Id<"exercises">;
  status: ChallengeStatus;
  startAt: number;
  endAt: number;
  winnerId?: string;
  completedAt?: number;
  createdAt: number;
  participantCount: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { label: "Active", value: "active" as StatusFilter },
  { label: "Completed", value: "completed" as StatusFilter },
  { label: "My Challenges", value: "my" as StatusFilter },
];

const CHALLENGE_TYPES = [
  { label: "Total Reps", value: "totalReps" as ChallengeType },
  { label: "Total Volume", value: "totalVolume" as ChallengeType },
  { label: "Workout Count", value: "workoutCount" as ChallengeType },
  { label: "Max Weight", value: "maxWeight" as ChallengeType },
];

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

// ── Component ────────────────────────────────────────────────────────────────

export default function ChallengesScreen() {
  const navigation = useNavigation<ChallengesNav>();

  // ── State ────────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // ── Create form state ────────────────────────────────────────────────────
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<ChallengeType>("totalReps");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<
    Id<"exercises"> | null
  >(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState("");
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────
  const statusArgs = useMemo(() => {
    if (statusFilter === "active") return { status: "active" as const };
    if (statusFilter === "completed") return { status: "completed" as const };
    return { myOnly: true };
  }, [statusFilter]);

  const challenges = useQuery(api.challenges.listChallenges, statusArgs);

  // Exercise list for challenge creation (only when creating exercise-specific challenges)
  const needsExercise = newType !== "workoutCount";
  const exercisesForPicker = useQuery(
    api.exercises.listExercises,
    showCreateForm && needsExercise ? {} : "skip",
  );

  const createChallenge = useMutation(api.challenges.createChallenge);

  // ── Create handler ───────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    // Validate inputs
    if (!newTitle.trim()) {
      Alert.alert("Validation Error", "Title is required");
      return;
    }

    const startAt = new Date(newStartDate).getTime();
    const endAt = new Date(newEndDate).getTime();

    if (isNaN(startAt) || isNaN(endAt)) {
      Alert.alert(
        "Validation Error",
        "Invalid date format. Use YYYY-MM-DD HH:MM",
      );
      return;
    }

    if (endAt <= Date.now()) {
      Alert.alert("Validation Error", "End time must be in the future");
      return;
    }

    if (startAt >= endAt) {
      Alert.alert("Validation Error", "Start time must be before end time");
      return;
    }

    if (needsExercise && !selectedExerciseId) {
      Alert.alert("Validation Error", "Please select an exercise");
      return;
    }

    setIsCreating(true);
    try {
      await createChallenge({
        title: newTitle.trim(),
        type: newType,
        startAt,
        endAt,
        ...(needsExercise && selectedExerciseId
          ? { exerciseId: selectedExerciseId }
          : {}),
      });

      // Reset form
      setNewTitle("");
      setNewStartDate("");
      setNewEndDate("");
      setSelectedExerciseId(null);
      setSelectedExerciseName("");
      setShowCreateForm(false);
      Alert.alert("Success", "Challenge created!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create challenge";
      console.error("[ChallengesScreen] createChallenge failed:", message);
      Alert.alert("Error", message);
    } finally {
      setIsCreating(false);
    }
  }, [
    newTitle,
    newType,
    newStartDate,
    newEndDate,
    selectedExerciseId,
    needsExercise,
    createChallenge,
  ]);

  // ── Render challenge card ────────────────────────────────────────────────
  const renderChallengeCard = useCallback(
    ({ item }: { item: ChallengeListItem }) => {
      const typeBadge = TYPE_BADGE_COLORS[item.type];
      const isActive =
        item.status === "active" || item.status === "pending";

      return (
        <TouchableOpacity
          style={styles.challengeCard}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate("ChallengeDetail", {
              challengeId: item._id as string,
            })
          }
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View
              style={[styles.typeBadge, { backgroundColor: typeBadge.bg }]}
            >
              <Text style={[styles.typeBadgeText, { color: typeBadge.text }]}>
                {TYPE_LABELS[item.type]}
              </Text>
            </View>
          </View>

          <View style={styles.cardMeta}>
            <Ionicons
              name="people-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.cardMetaText}>
              {item.participantCount} participant
              {item.participantCount !== 1 ? "s" : ""}
            </Text>
          </View>

          {isActive ? (
            <Text style={styles.cardTimeRemaining}>
              {formatTimeRemaining(item.endAt)}
            </Text>
          ) : item.status === "completed" ? (
            <Text style={styles.cardCompletedDate}>
              Completed {formatDate(item.completedAt ?? item.endAt)}
            </Text>
          ) : (
            <Text style={styles.cardCancelledText}>Cancelled</Text>
          )}
        </TouchableOpacity>
      );
    },
    [navigation],
  );

  // ── Main Render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Challenges</Text>
          <TouchableOpacity
            style={styles.leaderboardLink}
            onPress={() => navigation.navigate("Leaderboard")}
            activeOpacity={0.7}
          >
            <Ionicons name="trophy-outline" size={16} color={colors.accent} />
            <Text style={styles.leaderboardLinkText}>Leaderboards</Text>
          </TouchableOpacity>
        </View>

        {/* Status Filter */}
        <PillSelectorNative<StatusFilter>
          options={STATUS_FILTERS}
          selected={statusFilter}
          onSelect={setStatusFilter}
        />

        {/* Challenge List */}
        {challenges === undefined ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
        ) : challenges.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              No {statusFilter === "my" ? "" : statusFilter} challenges found.
            </Text>
          </View>
        ) : (
          <FlatList
            data={challenges as ChallengeListItem[]}
            renderItem={renderChallengeCard}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            contentContainerStyle={styles.cardList}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        )}

        {/* Create Challenge Toggle */}
        <TouchableOpacity
          style={styles.createToggleButton}
          onPress={() => setShowCreateForm(!showCreateForm)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showCreateForm ? "close-circle-outline" : "add-circle-outline"}
            size={20}
            color={colors.accent}
          />
          <Text style={styles.createToggleText}>
            {showCreateForm ? "Cancel" : "Create Challenge"}
          </Text>
        </TouchableOpacity>

        {/* Create Challenge Form */}
        {showCreateForm && (
          <View style={styles.createForm}>
            <Text style={styles.formLabel}>Title</Text>
            <TextInput
              style={styles.formInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Challenge title"
              placeholderTextColor={colors.textPlaceholder}
            />

            <Text style={styles.formLabel}>Type</Text>
            <PillSelectorNative<ChallengeType>
              options={CHALLENGE_TYPES}
              selected={newType}
              onSelect={(val) => {
                setNewType(val);
                // Reset exercise when switching to workoutCount
                if (val === "workoutCount") {
                  setSelectedExerciseId(null);
                  setSelectedExerciseName("");
                }
              }}
            />

            {/* Exercise Picker (for exercise-specific types) */}
            {needsExercise && (
              <>
                <Text style={styles.formLabel}>Exercise</Text>
                <TouchableOpacity
                  style={styles.exercisePickerButton}
                  onPress={() => setShowExercisePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.exercisePickerText,
                      !selectedExerciseName && styles.exercisePickerPlaceholder,
                    ]}
                  >
                    {selectedExerciseName || "Select Exercise"}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.formLabel}>Start Date</Text>
            <TextInput
              style={styles.formInput}
              value={newStartDate}
              onChangeText={setNewStartDate}
              placeholder="YYYY-MM-DD HH:MM"
              placeholderTextColor={colors.textPlaceholder}
            />

            <Text style={styles.formLabel}>End Date</Text>
            <TextInput
              style={styles.formInput}
              value={newEndDate}
              onChangeText={setNewEndDate}
              placeholder="YYYY-MM-DD HH:MM"
              placeholderTextColor={colors.textPlaceholder}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                isCreating && styles.submitButtonDisabled,
              ]}
              onPress={handleCreate}
              disabled={isCreating}
              activeOpacity={0.7}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Create Challenge</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Exercise Picker Modal */}
      <Modal
        visible={showExercisePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExercisePicker(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Exercise</Text>
            <TouchableOpacity
              onPress={() => setShowExercisePicker(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          {exercisesForPicker === undefined ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          ) : exercisesForPicker.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No exercises found.</Text>
            </View>
          ) : (
            <FlatList
              data={exercisesForPicker}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.exerciseOption,
                    selectedExerciseId === (item._id as Id<"exercises">) &&
                      styles.exerciseOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedExerciseId(item._id as Id<"exercises">);
                    setSelectedExerciseName(item.name);
                    setShowExercisePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.exerciseOptionText}>{item.name}</Text>
                  <Text style={styles.exerciseOptionMuscle}>
                    {item.primaryMuscleGroup}
                  </Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={styles.exerciseSeparator} />
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  leaderboardLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  leaderboardLinkText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.accent,
  },

  // Loading / Empty
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyBox: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
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

  // Challenge Cards
  cardList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  challengeCard: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  cardMetaText: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  cardTimeRemaining: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.accent,
  },
  cardCompletedDate: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  cardCancelledText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.destructive,
  },

  // Create Toggle
  createToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: "dashed",
  },
  createToggleText: {
    fontSize: 15,
    fontFamily: fontFamily.medium,
    color: colors.accent,
  },

  // Create Form
  createForm: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  formLabel: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  formInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },

  // Exercise Picker Button
  exercisePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  exercisePickerText: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },
  exercisePickerPlaceholder: {
    color: colors.textPlaceholder,
  },

  // Submit Button
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: "#FFFFFF",
  },

  // Modal
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  exerciseOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  exerciseOptionSelected: {
    backgroundColor: `${colors.accent}10`,
  },
  exerciseOptionText: {
    fontSize: 15,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  exerciseOptionMuscle: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exerciseSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },

  bottomSpacer: {
    height: spacing.xl,
  },
});
