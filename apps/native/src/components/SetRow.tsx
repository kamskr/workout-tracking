import React, { useState, useCallback, memo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import type { Id } from "@packages/backend/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { displayWeight, lbsToKg, type WeightUnit } from "../lib/units";
import { colors, fontFamily, spacing } from "../lib/theme";

interface SetData {
  _id: Id<"sets">;
  setNumber: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  tempo?: string;
  notes?: string;
  isWarmup: boolean;
}

interface SetRowProps {
  set: SetData;
  unit: WeightUnit;
}

function SetRowInner({ set, unit }: SetRowProps) {
  const updateSet = useMutation(api.sets.updateSet);
  const deleteSet = useMutation(api.sets.deleteSet);

  // Local state for inputs — display in user's unit
  const displayWeightValue =
    set.weight != null ? displayWeight(set.weight, unit) : "";
  const [localWeight, setLocalWeight] = useState<string>(
    displayWeightValue !== "" ? String(displayWeightValue) : "",
  );
  const [localReps, setLocalReps] = useState<string>(
    set.reps != null ? String(set.reps) : "",
  );
  const [localRpe, setLocalRpe] = useState<string>(
    set.rpe != null ? String(set.rpe) : "",
  );
  const [localTempo, setLocalTempo] = useState<string>(set.tempo ?? "");
  const [localNotes, setLocalNotes] = useState<string>(set.notes ?? "");
  const [showNotes, setShowNotes] = useState<boolean>(!!set.notes);

  // ── onBlur save handlers (D021 pattern) ──────────────────────────────

  const handleWeightBlur = useCallback(() => {
    const num = parseFloat(localWeight);
    if (isNaN(num) && set.weight == null) return;
    if (isNaN(num)) {
      void updateSet({ setId: set._id, weight: 0 }).catch((e: unknown) =>
        console.error("[SetRow] updateSet weight failed:", e),
      );
      return;
    }
    // Convert at boundary: display unit → kg for storage
    const kg = unit === "lbs" ? lbsToKg(num) : num;
    if (set.weight != null && Math.abs(kg - set.weight) < 0.01) return;
    void updateSet({ setId: set._id, weight: kg }).catch((e: unknown) =>
      console.error("[SetRow] updateSet weight failed:", e),
    );
  }, [localWeight, set._id, set.weight, unit, updateSet]);

  const handleRepsBlur = useCallback(() => {
    const num = parseInt(localReps, 10);
    if (isNaN(num) && set.reps == null) return;
    if (isNaN(num)) {
      void updateSet({ setId: set._id, reps: 0 }).catch((e: unknown) =>
        console.error("[SetRow] updateSet reps failed:", e),
      );
      return;
    }
    if (num === set.reps) return;
    void updateSet({ setId: set._id, reps: num }).catch((e: unknown) =>
      console.error("[SetRow] updateSet reps failed:", e),
    );
  }, [localReps, set._id, set.reps, updateSet]);

  const handleRpeBlur = useCallback(() => {
    const num = parseInt(localRpe, 10);
    if (isNaN(num) && set.rpe == null) return;
    if (isNaN(num)) return; // Cleared field — no update
    if (num === set.rpe) return;
    const clamped = Math.max(1, Math.min(10, num));
    setLocalRpe(String(clamped));
    void updateSet({ setId: set._id, rpe: clamped }).catch((e: unknown) =>
      console.error("[SetRow] updateSet rpe failed:", e),
    );
  }, [localRpe, set._id, set.rpe, updateSet]);

  const handleTempoBlur = useCallback(() => {
    const trimmed = localTempo.trim();
    if (trimmed === (set.tempo ?? "")) return;
    if (trimmed === "") return;
    void updateSet({ setId: set._id, tempo: trimmed }).catch((e: unknown) =>
      console.error("[SetRow] updateSet tempo failed:", e),
    );
  }, [localTempo, set._id, set.tempo, updateSet]);

  const handleNotesBlur = useCallback(() => {
    const trimmed = localNotes.trim();
    if (trimmed === (set.notes ?? "")) return;
    if (trimmed === "") return;
    void updateSet({ setId: set._id, notes: trimmed }).catch((e: unknown) =>
      console.error("[SetRow] updateSet notes failed:", e),
    );
  }, [localNotes, set._id, set.notes, updateSet]);

  const handleWarmupToggle = useCallback(() => {
    void updateSet({ setId: set._id, isWarmup: !set.isWarmup }).catch(
      (e: unknown) => console.error("[SetRow] updateSet warmup failed:", e),
    );
  }, [set._id, set.isWarmup, updateSet]);

  const handleDelete = useCallback(() => {
    Alert.alert("Delete Set", `Delete set ${set.setNumber}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteSet({ setId: set._id }).catch((e: unknown) =>
            console.error("[SetRow] deleteSet failed:", e),
          );
        },
      },
    ]);
  }, [deleteSet, set._id, set.setNumber]);

  return (
    <View>
      {/* Main set row */}
      <View
        style={[styles.row, set.isWarmup && styles.warmupRow]}
      >
        {/* Set number */}
        <View style={styles.setNumCol}>
          <Text style={styles.setNum}>
            {set.isWarmup ? "W" : set.setNumber}
          </Text>
        </View>

        {/* Weight input */}
        <View style={styles.inputCol}>
          <TextInput
            style={styles.input}
            value={localWeight}
            onChangeText={setLocalWeight}
            onBlur={handleWeightBlur}
            placeholder={`0 ${unit}`}
            placeholderTextColor={colors.textPlaceholder}
            keyboardType="numeric"
            returnKeyType="done"
            accessibilityLabel={`Weight for set ${set.setNumber}`}
          />
        </View>

        {/* Reps input */}
        <View style={styles.inputCol}>
          <TextInput
            style={styles.input}
            value={localReps}
            onChangeText={setLocalReps}
            onBlur={handleRepsBlur}
            placeholder="0 reps"
            placeholderTextColor={colors.textPlaceholder}
            keyboardType="numeric"
            returnKeyType="done"
            accessibilityLabel={`Reps for set ${set.setNumber}`}
          />
        </View>

        {/* RPE input */}
        <View style={styles.rpeCol}>
          <TextInput
            style={[styles.input, styles.inputCenter]}
            value={localRpe}
            onChangeText={setLocalRpe}
            onBlur={handleRpeBlur}
            placeholder="RPE"
            placeholderTextColor={colors.textPlaceholder}
            keyboardType="numeric"
            returnKeyType="done"
            accessibilityLabel={`RPE for set ${set.setNumber}`}
          />
        </View>

        {/* Action buttons row */}
        <View style={styles.actionsCol}>
          {/* Notes toggle */}
          <TouchableOpacity
            onPress={() => setShowNotes((prev) => !prev)}
            style={styles.iconButton}
            accessibilityLabel={showNotes ? "Hide notes" : "Show notes"}
            accessibilityRole="button"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name="chatbubble-outline"
              size={15}
              color={showNotes ? colors.accent : colors.textPlaceholder}
            />
          </TouchableOpacity>

          {/* Warmup toggle */}
          <TouchableOpacity
            onPress={handleWarmupToggle}
            style={[styles.warmupBadge, set.isWarmup && styles.warmupBadgeActive]}
            accessibilityLabel={
              set.isWarmup ? "Mark as working set" : "Mark as warmup"
            }
            accessibilityRole="button"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text
              style={[
                styles.warmupBadgeText,
                set.isWarmup && styles.warmupBadgeTextActive,
              ]}
            >
              W
            </Text>
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.iconButton}
            accessibilityLabel={`Delete set ${set.setNumber}`}
            accessibilityRole="button"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close" size={16} color={colors.textPlaceholder} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tempo row (always visible below main row for compactness) */}
      {(localTempo !== "" || showNotes) && (
        <View style={styles.extraRow}>
          <TextInput
            style={[styles.extraInput, { flex: 1 }]}
            value={localTempo}
            onChangeText={setLocalTempo}
            onBlur={handleTempoBlur}
            placeholder="Tempo (e.g. 3-1-2-0)"
            placeholderTextColor={colors.textPlaceholder}
            returnKeyType="done"
            accessibilityLabel={`Tempo for set ${set.setNumber}`}
          />
        </View>
      )}

      {/* Collapsible notes row (D029) */}
      {showNotes && (
        <View style={styles.extraRow}>
          <TextInput
            style={[styles.extraInput, { flex: 1 }]}
            value={localNotes}
            onChangeText={setLocalNotes}
            onBlur={handleNotesBlur}
            placeholder="Set notes…"
            placeholderTextColor={colors.textPlaceholder}
            returnKeyType="done"
            accessibilityLabel={`Notes for set ${set.setNumber}`}
          />
        </View>
      )}
    </View>
  );
}

const SetRow = memo(SetRowInner);
SetRow.displayName = "SetRow";
export default SetRow;

export type { SetData };

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    minHeight: 44,
    gap: 4,
  },
  warmupRow: {
    backgroundColor: "#FEF3C7",
  },
  setNumCol: {
    width: 28,
    alignItems: "center",
  },
  setNum: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  inputCol: {
    flex: 2,
  },
  rpeCol: {
    width: 48,
  },
  input: {
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },
  inputCenter: {
    textAlign: "center",
  },
  actionsCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  iconButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  warmupBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.backgroundSecondary,
  },
  warmupBadgeActive: {
    backgroundColor: "#FDE68A",
  },
  warmupBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.semiBold,
    color: colors.textPlaceholder,
  },
  warmupBadgeTextActive: {
    color: "#92400E",
  },
  extraRow: {
    flexDirection: "row",
    paddingLeft: 36,
    paddingRight: spacing.sm,
    paddingVertical: 2,
  },
  extraInput: {
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },
});
