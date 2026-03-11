import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import ExerciseFilters, {
  type ExerciseFilterState,
} from "../components/ExerciseFilters";
import ExerciseCard, { type Exercise } from "../components/ExerciseCard";
import { colors, fontFamily, spacing } from "../lib/theme";

const INITIAL_FILTERS: ExerciseFilterState = {
  searchQuery: "",
  primaryMuscleGroup: "",
  equipment: "",
};

export default function ExercisesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [filters, setFilters] = useState<ExerciseFilterState>(INITIAL_FILTERS);

  // Build query args — only include non-empty filter values (same pattern as web)
  const queryArgs = useMemo(() => {
    const args: Record<string, string> = {};
    const trimmedSearch = filters.searchQuery.trim();
    if (trimmedSearch) args.searchQuery = trimmedSearch;
    if (filters.primaryMuscleGroup)
      args.primaryMuscleGroup = filters.primaryMuscleGroup;
    if (filters.equipment) args.equipment = filters.equipment;
    return args;
  }, [filters.searchQuery, filters.primaryMuscleGroup, filters.equipment]);

  const exercises = useQuery(api.exercises.listExercises, queryArgs);

  const isLoading = exercises === undefined;
  const isEmpty = exercises !== undefined && exercises.length === 0;

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <ExerciseCard
        exercise={item}
        onPress={() =>
          navigation.navigate("ExerciseDetail", { exerciseId: item._id })
        }
      />
    ),
    [navigation],
  );

  const keyExtractor = useCallback((item: Exercise) => item._id, []);

  const ListHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <ExerciseFilters filters={filters} onFiltersChange={setFilters} />
        {!isLoading && exercises && exercises.length > 0 && (
          <Text style={styles.countText}>
            {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>
    ),
    [filters, isLoading, exercises],
  );

  const ListEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color={colors.accent}
            accessibilityLabel="Loading exercises"
          />
          <Text style={styles.loadingText}>Loading exercises…</Text>
        </View>
      );
    }

    if (isEmpty) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No exercises match your filters</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or filters.
          </Text>
        </View>
      );
    }

    return null;
  }, [isLoading, isEmpty]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Exercises</Text>
      </View>
      <FlatList
        data={exercises ?? []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={
          (!exercises || exercises.length === 0) ? styles.emptyList : styles.list
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  titleRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  listHeader: {
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  countText: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
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
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
