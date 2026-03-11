import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ── Shared enum-like validators ──────────────────────────────────────────────
// Using v.union(v.literal(...)) enforces exact values at runtime.

const muscleGroup = v.union(
  v.literal("chest"),
  v.literal("back"),
  v.literal("shoulders"),
  v.literal("biceps"),
  v.literal("triceps"),
  v.literal("legs"),
  v.literal("core"),
  v.literal("fullBody"),
  v.literal("cardio"),
);

const equipment = v.union(
  v.literal("barbell"),
  v.literal("dumbbell"),
  v.literal("cable"),
  v.literal("machine"),
  v.literal("bodyweight"),
  v.literal("kettlebell"),
  v.literal("bands"),
  v.literal("other"),
);

const exerciseType = v.union(
  v.literal("strength"),
  v.literal("cardio"),
  v.literal("bodyweight"),
  v.literal("stretch"),
  v.literal("plyometric"),
);

const workoutStatus = v.union(
  v.literal("planned"),
  v.literal("inProgress"),
  v.literal("completed"),
);

const weightUnit = v.union(v.literal("kg"), v.literal("lbs"));

// ── Schema ───────────────────────────────────────────────────────────────────

export default defineSchema({
  // ── Notes (existing, kept for backward compatibility) ────────────────────
  notes: defineTable({
    userId: v.string(),
    title: v.string(),
    content: v.string(),
    summary: v.optional(v.string()),
  }),

  // ── Exercise Library ─────────────────────────────────────────────────────
  exercises: defineTable({
    name: v.string(),
    slug: v.string(),
    primaryMuscleGroup: muscleGroup,
    secondaryMuscleGroups: v.array(muscleGroup),
    equipment: equipment,
    exerciseType: exerciseType,
    instructions: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isCustom: v.boolean(),
    userId: v.optional(v.string()),
    defaultRestSeconds: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_primaryMuscleGroup", ["primaryMuscleGroup"])
    .index("by_equipment", ["equipment"])
    .index("by_type", ["exerciseType"])
    .index("by_user_custom", ["userId", "isCustom"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["primaryMuscleGroup", "equipment", "exerciseType"],
    }),

  // ── Workouts ─────────────────────────────────────────────────────────────
  workouts: defineTable({
    userId: v.string(),
    name: v.string(),
    status: workoutStatus,
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"]),

  // ── Workout Exercises (join table: workout → exercise) ───────────────────
  workoutExercises: defineTable({
    workoutId: v.id("workouts"),
    exerciseId: v.id("exercises"),
    order: v.number(),
    supersetGroupId: v.optional(v.string()),
    restSeconds: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_workoutId", ["workoutId"])
    .index("by_exerciseId", ["exerciseId"]),

  // ── Sets ─────────────────────────────────────────────────────────────────
  // Weight stored in kg internally (D003).
  sets: defineTable({
    workoutExerciseId: v.id("workoutExercises"),
    setNumber: v.number(),
    weight: v.optional(v.number()),
    reps: v.optional(v.number()),
    rpe: v.optional(v.number()),
    tempo: v.optional(v.string()),
    notes: v.optional(v.string()),
    isWarmup: v.boolean(),
    completedAt: v.optional(v.number()),
  }).index("by_workoutExerciseId", ["workoutExerciseId"]),

  // ── Workout Templates ────────────────────────────────────────────────────
  workoutTemplates: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    createdFromWorkoutId: v.optional(v.id("workouts")),
  }).index("by_userId", ["userId"]),

  // ── Template Exercises ───────────────────────────────────────────────────
  templateExercises: defineTable({
    templateId: v.id("workoutTemplates"),
    exerciseId: v.id("exercises"),
    order: v.number(),
    targetSets: v.optional(v.number()),
    targetReps: v.optional(v.number()),
    targetWeight: v.optional(v.number()),
    restSeconds: v.optional(v.number()),
  }).index("by_templateId", ["templateId"]),

  // ── User Preferences ────────────────────────────────────────────────────
  userPreferences: defineTable({
    userId: v.string(),
    weightUnit: weightUnit,
    defaultRestSeconds: v.optional(v.number()),
  }).index("by_userId", ["userId"]),
});
