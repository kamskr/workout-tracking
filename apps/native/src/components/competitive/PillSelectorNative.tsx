import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors, fontFamily, spacing } from "../../lib/theme";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PillOption<T extends string> {
  label: string;
  value: T;
}

interface PillSelectorNativeProps<T extends string> {
  options: PillOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Generic pill selector for string-valued options.
 * Renders a horizontal scrollable row of pill buttons.
 * Selected pill uses accent background; unselected uses border + secondary bg.
 *
 * Unlike PeriodSelector (which accepts `number | undefined`), this component
 * is generic over any string union type — suitable for exercise names,
 * metric types, leaderboard categories, etc.
 */
export default function PillSelectorNative<T extends string>({
  options,
  selected,
  onSelect,
}: PillSelectorNativeProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.pill, isSelected && styles.pillSelected]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
          >
            <Text
              style={[styles.pillText, isSelected && styles.pillTextSelected]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: "#FFFFFF",
  },
});
