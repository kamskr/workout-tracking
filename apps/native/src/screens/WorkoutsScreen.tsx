import React, { useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import WorkoutCard from "../components/WorkoutCard";
import { colors, fontFamily, spacing } from "../lib/theme";

interface WorkoutsScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export default function WorkoutsScreen({ navigation }: WorkoutsScreenProps) {
  const workouts = useQuery(api.workouts.listWorkouts);

  const handleStartWorkout = useCallback(() => {
    navigation.navigate("ActiveWorkout");
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

      {/* Start Workout button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartWorkout}
          accessibilityLabel="Start workout"
          accessibilityRole="button"
        >
          <Ionicons name="play" size={20} color="#FFFFFF" />
          <Text style={styles.startButtonText}>Start Workout</Text>
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
});
