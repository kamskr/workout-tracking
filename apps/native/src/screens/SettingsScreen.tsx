import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@packages/backend/convex/_generated/api";
import { formatRestTime } from "../lib/units";
import { colors, spacing, fontFamily } from "../lib/theme";

const DEFAULT_REST_SECONDS = 90;
const REST_STEP = 15;
const MIN_REST = 15;
const MAX_REST = 300;

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const prefs = useQuery(api.userPreferences.getPreferences);
  const setUnit = useMutation(api.userPreferences.setUnitPreference);
  const setRest = useMutation(api.userPreferences.setDefaultRestSeconds);

  if (!prefs) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  const currentUnit = prefs.weightUnit ?? "kg";
  const currentRest =
    "defaultRestSeconds" in prefs && prefs.defaultRestSeconds != null
      ? prefs.defaultRestSeconds
      : DEFAULT_REST_SECONDS;

  const handleUnitToggle = () => {
    const nextUnit = currentUnit === "kg" ? "lbs" : "kg";
    setUnit({ unit: nextUnit }).catch((err: unknown) =>
      console.error("[SettingsScreen] setUnitPreference failed:", err),
    );
  };

  const handleRestChange = (delta: number) => {
    const next = Math.max(MIN_REST, Math.min(MAX_REST, currentRest + delta));
    if (next === currentRest) return;
    setRest({ defaultRestSeconds: next }).catch((err: unknown) =>
      console.error("[SettingsScreen] setDefaultRestSeconds failed:", err),
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("[SettingsScreen] signOut failed:", err);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Settings</Text>

        {/* ── Unit Preference ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weight Unit</Text>
          <View style={styles.row}>
            <Text style={styles.label}>
              Display weights in{" "}
              <Text style={styles.valueBold}>{currentUnit}</Text>
            </Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={handleUnitToggle}
              accessibilityLabel={`Switch to ${currentUnit === "kg" ? "lbs" : "kg"}`}
              accessibilityRole="button"
            >
              <Text style={styles.toggleText}>
                Switch to {currentUnit === "kg" ? "lbs" : "kg"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Default Rest Time ────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Rest Time</Text>
          <View style={styles.restRow}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => handleRestChange(-REST_STEP)}
              disabled={currentRest <= MIN_REST}
              accessibilityLabel={`Decrease rest time by ${REST_STEP} seconds`}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.stepButtonText,
                  currentRest <= MIN_REST && styles.stepButtonDisabled,
                ]}
              >
                −{REST_STEP}s
              </Text>
            </TouchableOpacity>

            <Text style={styles.restDisplay}>{formatRestTime(currentRest)}</Text>

            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => handleRestChange(REST_STEP)}
              disabled={currentRest >= MAX_REST}
              accessibilityLabel={`Increase rest time by ${REST_STEP} seconds`}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.stepButtonText,
                  currentRest >= MAX_REST && styles.stepButtonDisabled,
                ]}
              >
                +{REST_STEP}s
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Sign Out ─────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    fontSize: 28,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 16,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },
  valueBold: {
    fontFamily: fontFamily.semiBold,
  },
  toggleButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  toggleText: {
    color: "#FFFFFF",
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
  },
  restRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  stepButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepButtonText: {
    fontSize: 14,
    fontFamily: fontFamily.semiBold,
    color: colors.accent,
  },
  stepButtonDisabled: {
    color: colors.textPlaceholder,
  },
  restDisplay: {
    fontSize: 32,
    fontFamily: fontFamily.bold,
    color: colors.text,
    minWidth: 80,
    textAlign: "center",
  },
  signOutButton: {
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },
  signOutText: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: colors.destructive,
  },
});
