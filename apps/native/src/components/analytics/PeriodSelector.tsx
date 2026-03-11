import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors, fontFamily, spacing } from "../../lib/theme";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PeriodOption {
  label: string;
  value: number | undefined;
}

interface PeriodSelectorProps {
  periods: PeriodOption[];
  selected: number | undefined;
  onSelect: (value: number | undefined) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PeriodSelector({
  periods,
  selected,
  onSelect,
}: PeriodSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {periods.map((period) => {
        const isSelected = period.value === selected;
        return (
          <TouchableOpacity
            key={period.label}
            style={[styles.pill, isSelected && styles.pillSelected]}
            onPress={() => onSelect(period.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
              {period.label}
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
