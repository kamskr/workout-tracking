import React, { useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { WorkoutsStackParamList } from "../navigation/MainTabs";
import WorkoutCard from "../components/WorkoutCard";
import { colors, fontFamily, spacing } from "../lib/theme";

interface WorkoutsScreenProps {
  navigation: NativeStackNavigationProp<WorkoutsStackParamList, "WorkoutHistory">;
}

export default function WorkoutsScreen({ navigation }: WorkoutsScreenProps) {
  const workouts = useQuery(api.workouts.listWorkouts);
  const createSession = useMutation(api.sessions.createSession);

  /** D022: useRef guard to prevent double-tap on create session */
  const createInFlight = useRef(false);

  const handleStartWorkout = useCallback(() => {
    navigation.navigate("ActiveWorkout");
  }, [navigation]);

  const handleStartGroupSession = useCallback(async () => {
    if (createInFlight.current) return;
    createInFlight.current = true;

    try {
      const result = await createSession();
      console.log(
        `[Session] Create success: sessionId=${result.sessionId}, inviteCode=${result.inviteCode}`,
      );
      navigation.navigate("GroupSession", { sessionId: result.sessionId });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create session";
      console.error(`[Session] Create failed: ${message}`);
    } finally {
      createInFlight.current = false;
    }
  }, [createSession, navigation]);

  const handleJoinSession = useCallback(() => {
    navigation.navigate("JoinSession");
  }, [navigation]);

  const renderWorkout = useCallback(
    ({ item }: { item: NonNullable<typeof workouts>[number] }) => (
      <WorkoutCard workout={item} />
    ),
    [],
  );

  // Loading state
  if (workouts === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Workouts</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Workouts</Text>
      </View>

      {workouts.length === 0 ? (
        // Empty state
        <View style={styles.center}>
          <Ionicons name="fitness-outline" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>No workouts yet</Text>
          <Text style={styles.emptySubtitle}>
            Start a workout to begin logging your progress.
          </Text>
        </View>
      ) : (
        // Populated state
        <FlatList
          data={workouts}
          keyExtractor={(item) => item._id}
          renderItem={renderWorkout}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        {/* Primary: Start Workout */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartWorkout}
          accessibilityLabel="Start workout"
          accessibilityRole="button"
        >
          <Ionicons name="play" size={20} color="#FFFFFF" />
          <Text style={styles.startButtonText}>Start Workout</Text>
        </TouchableOpacity>

        {/* Secondary: Start Group Session */}
        <TouchableOpacity
          style={styles.groupButton}
          onPress={handleStartGroupSession}
          accessibilityLabel="Start group session"
          accessibilityRole="button"
        >
          <Ionicons name="people" size={20} color={colors.accent} />
          <Text style={styles.groupButtonText}>Start Group Session</Text>
        </TouchableOpacity>

        {/* Tertiary: Join Session link */}
        <TouchableOpacity
          style={styles.joinLink}
          onPress={handleJoinSession}
          accessibilityLabel="Join session"
          accessibilityRole="button"
        >
          <Text style={styles.joinLinkText}>Join Session</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textPlaceholder,
    textAlign: "center",
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
  },
  startButtonText: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: "#FFFFFF",
  },
  groupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  groupButtonText: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: colors.accent,
  },
  joinLink: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  joinLinkText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: colors.accent,
  },
});
