import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { api } from "@packages/backend/convex/_generated/api";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ProfileStatsNative from "../components/social/ProfileStatsNative";
import { colors, fontFamily, spacing } from "../lib/theme";
import { formatRestTime, type WeightUnit } from "../lib/units";

// ── Settings Constants ───────────────────────────────────────────────────────

const DEFAULT_REST_SECONDS = 90;
const REST_STEP = 15;
const MIN_REST = 15;
const MAX_REST = 300;

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

// ── ProfileScreen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useUser();
  const { signOut } = useAuth();

  const userId = user?.id;

  const profile = useQuery(
    api.profiles.getProfile,
    userId ? { userId } : "skip",
  );
  const prefs = useQuery(api.userPreferences.getPreferences);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const setUnit = useMutation(api.userPreferences.setUnitPreference);
  const setRest = useMutation(api.userPreferences.setDefaultRestSeconds);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const weightUnit: WeightUnit = (prefs?.weightUnit as WeightUnit) ?? "kg";
  const currentRest =
    prefs && "defaultRestSeconds" in prefs && prefs.defaultRestSeconds != null
      ? prefs.defaultRestSeconds
      : DEFAULT_REST_SECONDS;

  const handleStartEdit = useCallback(() => {
    if (!profile) return;
    setEditDisplayName(profile.displayName);
    setEditBio(profile.bio ?? "");
    setEditError(null);
    setIsEditing(true);
  }, [profile]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditError(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editDisplayName.trim()) {
      setEditError("Display name is required");
      return;
    }
    setIsSaving(true);
    setEditError(null);
    try {
      await updateProfile({
        displayName: editDisplayName.trim(),
        bio: editBio.trim() || undefined,
      });
      setIsEditing(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      console.error("[ProfileScreen] updateProfile failed:", message);
      setEditError(message);
    } finally {
      setIsSaving(false);
    }
  }, [editDisplayName, editBio, updateProfile]);

  const handleUnitToggle = useCallback(() => {
    const nextUnit = weightUnit === "kg" ? "lbs" : "kg";
    setUnit({ unit: nextUnit }).catch((err: unknown) =>
      console.error("[ProfileScreen] setUnitPreference failed:", err),
    );
  }, [weightUnit, setUnit]);

  const handleRestChange = useCallback(
    (delta: number) => {
      const next = Math.max(MIN_REST, Math.min(MAX_REST, currentRest + delta));
      if (next === currentRest) return;
      setRest({ defaultRestSeconds: next }).catch((err: unknown) =>
        console.error("[ProfileScreen] setDefaultRestSeconds failed:", err),
      );
    },
    [currentRest, setRest],
  );

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("[ProfileScreen] signOut failed:", err);
    }
  }, [signOut]);

  const handleGoToSetup = useCallback(() => {
    navigation.navigate("ProfileSetup");
  }, [navigation]);

  // Loading: profile query hasn't returned yet
  if (profile === undefined || prefs === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // Profile not created — show setup prompt
  if (profile === null) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.setupPrompt}>
            <Text style={styles.setupTitle}>Set up your profile</Text>
            <Text style={styles.setupSubtitle}>
              Create a username to start sharing workouts and connecting with
              other lifters.
            </Text>
            <TouchableOpacity
              style={styles.setupButton}
              onPress={handleGoToSetup}
              accessibilityLabel="Set up profile"
              accessibilityRole="button"
            >
              <Text style={styles.setupButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>

          {/* Settings still available without profile */}
          <SettingsSection
            weightUnit={weightUnit}
            currentRest={currentRest}
            onUnitToggle={handleUnitToggle}
            onRestChange={handleRestChange}
            onSignOut={handleSignOut}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Profile exists — full view
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profile</Text>

        {/* Profile header card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {/* Avatar */}
            <View style={styles.avatar}>
              {profile.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={styles.avatarImage}
                  accessibilityLabel={profile.displayName}
                />
              ) : (
                <Text style={styles.avatarInitials}>
                  {getInitials(profile.displayName)}
                </Text>
              )}
            </View>

            {/* Edit button */}
            {!isEditing && (
              <TouchableOpacity
                onPress={handleStartEdit}
                style={styles.editButton}
                accessibilityLabel="Edit profile"
                accessibilityRole="button"
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            /* Edit form inline */
            <View style={styles.editForm}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Display Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editDisplayName}
                  onChangeText={setEditDisplayName}
                  placeholder="Your Name"
                  placeholderTextColor={colors.textPlaceholder}
                  editable={!isSaving}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Bio</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputMultiline]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Tell others about yourself…"
                  placeholderTextColor={colors.textPlaceholder}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isSaving}
                />
              </View>
              {editError && (
                <Text style={styles.editError}>{editError}</Text>
              )}
              <View style={styles.editActions}>
                <TouchableOpacity
                  onPress={handleSaveEdit}
                  disabled={isSaving}
                  style={[
                    styles.saveButton,
                    isSaving && styles.buttonDisabled,
                  ]}
                  accessibilityLabel={isSaving ? "Saving" : "Save"}
                  accessibilityRole="button"
                >
                  <Text style={styles.saveButtonText}>
                    {isSaving ? "Saving…" : "Save"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCancelEdit}
                  disabled={isSaving}
                  style={styles.cancelButton}
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Display mode */
            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>{profile.displayName}</Text>
              <Text style={styles.username}>@{profile.username}</Text>
              {profile.bio ? (
                <Text style={styles.bio}>{profile.bio}</Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Stats section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Stats</Text>
          <ProfileStatsNative userId={userId!} weightUnit={weightUnit} />
        </View>

        {/* Settings section */}
        <SettingsSection
          weightUnit={weightUnit}
          currentRest={currentRest}
          onUnitToggle={handleUnitToggle}
          onRestChange={handleRestChange}
          onSignOut={handleSignOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Settings Section (reusable) ──────────────────────────────────────────────

function SettingsSection({
  weightUnit,
  currentRest,
  onUnitToggle,
  onRestChange,
  onSignOut,
}: {
  weightUnit: string;
  currentRest: number;
  onUnitToggle: () => void;
  onRestChange: (delta: number) => void;
  onSignOut: () => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Settings</Text>

      {/* Weight Unit */}
      <View style={settingsStyles.row}>
        <Text style={settingsStyles.label}>
          Display weights in{" "}
          <Text style={settingsStyles.valueBold}>{weightUnit}</Text>
        </Text>
        <TouchableOpacity
          style={settingsStyles.toggleButton}
          onPress={onUnitToggle}
          accessibilityLabel={`Switch to ${weightUnit === "kg" ? "lbs" : "kg"}`}
          accessibilityRole="button"
        >
          <Text style={settingsStyles.toggleText}>
            Switch to {weightUnit === "kg" ? "lbs" : "kg"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Default Rest Time */}
      <View style={settingsStyles.restSection}>
        <Text style={settingsStyles.restLabel}>Default Rest Time</Text>
        <View style={settingsStyles.restRow}>
          <TouchableOpacity
            style={settingsStyles.stepButton}
            onPress={() => onRestChange(-REST_STEP)}
            disabled={currentRest <= MIN_REST}
            accessibilityLabel={`Decrease rest time by ${REST_STEP} seconds`}
            accessibilityRole="button"
          >
            <Text
              style={[
                settingsStyles.stepButtonText,
                currentRest <= MIN_REST && settingsStyles.stepButtonDisabled,
              ]}
            >
              −{REST_STEP}s
            </Text>
          </TouchableOpacity>

          <Text style={settingsStyles.restDisplay}>
            {formatRestTime(currentRest)}
          </Text>

          <TouchableOpacity
            style={settingsStyles.stepButton}
            onPress={() => onRestChange(REST_STEP)}
            disabled={currentRest >= MAX_REST}
            accessibilityLabel={`Increase rest time by ${REST_STEP} seconds`}
            accessibilityRole="button"
          >
            <Text
              style={[
                settingsStyles.stepButtonText,
                currentRest >= MAX_REST && settingsStyles.stepButtonDisabled,
              ]}
            >
              +{REST_STEP}s
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={settingsStyles.signOutButton}
        onPress={onSignOut}
        accessibilityLabel="Sign out"
        accessibilityRole="button"
      >
        <Text style={settingsStyles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl * 2,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily.bold,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  // Profile card
  profileCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarInitials: {
    fontSize: 20,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
  },
  editButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  profileInfo: {
    marginTop: spacing.md,
  },
  displayName: {
    fontSize: 20,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  username: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  // Edit form
  editForm: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
  },
  fieldInputMultiline: {
    minHeight: 64,
    paddingTop: 8,
  },
  editError: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.destructive,
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.text,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.background,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Sections
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  // Setup prompt
  setupPrompt: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  setupTitle: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
    color: colors.text,
  },
  setupSubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  setupButton: {
    backgroundColor: colors.text,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    marginTop: spacing.sm,
  },
  setupButtonText: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    color: colors.background,
  },
});

const settingsStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 16,
    fontFamily: fontFamily.regular,
    color: colors.text,
    flex: 1,
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
  restSection: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  restLabel: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
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
