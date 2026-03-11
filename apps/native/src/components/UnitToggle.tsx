import React from "react";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { WeightUnit } from "../lib/units";
import { colors, fontFamily, spacing } from "../lib/theme";

export default function UnitToggle() {
  const preferences = useQuery(api.userPreferences.getPreferences);
  const setUnitPreference = useMutation(api.userPreferences.setUnitPreference);

  const currentUnit: WeightUnit = preferences?.weightUnit ?? "kg";

  const handleToggle = (unit: WeightUnit) => {
    if (unit === currentUnit) return;
    void setUnitPreference({ unit }).catch((err: unknown) =>
      console.error("[UnitToggle] setUnitPreference failed:", err),
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.option, currentUnit === "kg" && styles.optionActive]}
        onPress={() => handleToggle("kg")}
        accessibilityLabel="Switch to kilograms"
        accessibilityRole="button"
        accessibilityState={{ selected: currentUnit === "kg" }}
      >
        <Text
          style={[styles.optionText, currentUnit === "kg" && styles.optionTextActive]}
        >
          kg
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.option, currentUnit === "lbs" && styles.optionActive]}
        onPress={() => handleToggle("lbs")}
        accessibilityLabel="Switch to pounds"
        accessibilityRole="button"
        accessibilityState={{ selected: currentUnit === "lbs" }}
      >
        <Text
          style={[
            styles.optionText,
            currentUnit === "lbs" && styles.optionTextActive,
          ]}
        >
          lbs
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 2,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  optionActive: {
    backgroundColor: colors.accent,
  },
  optionText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: "#FFFFFF",
  },
});
