import React, { useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontFamily, spacing } from "../lib/theme";

/** Filter state matching the listExercises query args. */
export interface ExerciseFilterState {
  searchQuery: string;
  primaryMuscleGroup: string;
  equipment: string;
}

interface ExerciseFiltersProps {
  filters: ExerciseFilterState;
  onFiltersChange: (filters: ExerciseFilterState) => void;
}

export const MUSCLE_GROUPS = [
  { value: "", label: "All Muscles" },
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "legs", label: "Legs" },
  { value: "core", label: "Core" },
  { value: "fullBody", label: "Full Body" },
  { value: "cardio", label: "Cardio" },
] as const;

export const EQUIPMENT_OPTIONS = [
  { value: "", label: "All Equipment" },
  { value: "barbell", label: "Barbell" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "cable", label: "Cable" },
  { value: "machine", label: "Machine" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "bands", label: "Bands" },
  { value: "other", label: "Other" },
] as const;

function ChipRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={chipStyles.container}>
      <Text style={chipStyles.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={chipStyles.scrollContent}
      >
        {options.map((opt) => {
          const isActive = opt.value === selected;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[chipStyles.chip, isActive && chipStyles.chipActive]}
              onPress={() => onSelect(opt.value)}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${opt.label}`}
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  chipStyles.chipText,
                  isActive && chipStyles.chipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function ExerciseFilters({
  filters,
  onFiltersChange,
}: ExerciseFiltersProps) {
  const searchRef = useRef<TextInput>(null);

  const update = useCallback(
    (patch: Partial<ExerciseFilterState>) =>
      onFiltersChange({ ...filters, ...patch }),
    [filters, onFiltersChange],
  );

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textPlaceholder}
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            placeholder="Search exercises…"
            placeholderTextColor={colors.textPlaceholder}
            value={filters.searchQuery}
            onChangeText={(text) => update({ searchQuery: text })}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search exercises"
          />
        </View>
      </View>

      {/* Muscle group chips */}
      <ChipRow
        label="Muscle"
        options={MUSCLE_GROUPS}
        selected={filters.primaryMuscleGroup}
        onSelect={(value) => update({ primaryMuscleGroup: value })}
      />

      {/* Equipment chips */}
      <ChipRow
        label="Equipment"
        options={EQUIPMENT_OPTIONS}
        selected={filters.equipment}
        onSelect={(value) => update({ equipment: value })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  searchRow: {
    paddingHorizontal: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },
});

const chipStyles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
});
