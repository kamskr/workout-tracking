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

const prType = v.union(
  v.literal("weight"),
  v.literal("volume"),
  v.literal("reps"),
);

const weightUnit = v.union(v.literal("kg"), v.literal("lbs"));

const feedItemType = v.union(
  v.literal("workout_completed"),
  v.literal("workout_shared"),
);

const reactionType = v.union(
  v.literal("fire"),
  v.literal("fistBump"),
  v.literal("clap"),
  v.literal("strongArm"),
  v.literal("trophy"),
);

const reportTargetType = v.union(
  v.literal("feedItem"),
  v.literal("profile"),
);

const leaderboardMetric = v.union(
  v.literal("e1rm"),
  v.literal("volume"),
  v.literal("reps"),
);

const challengeType = v.union(
  v.literal("totalReps"),
  v.literal("totalVolume"),
  v.literal("workoutCount"),
  v.literal("maxWeight"),
);

const challengeStatus = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("completed"),
  v.literal("cancelled"),
);

// Export validators for use in social.ts, testing.ts, leaderboards.ts, and challenges.ts
export {
  feedItemType,
  reactionType,
  reportTargetType,
  leaderboardMetric,
  challengeType,
  challengeStatus,
};

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
    isPublic: v.optional(v.boolean()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"])
    .index("by_userId_completedAt", ["userId", "completedAt"]),

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

  // ── User Profiles ──────────────────────────────────────────────────────────
  // Cross-user readable table — profile queries accept a userId/username arg
  // and return data for any authenticated user (not just the owner).
  profiles: defineTable({
    userId: v.string(),
    username: v.string(),
    usernameLower: v.string(),
    displayName: v.string(),
    bio: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    isPublic: v.boolean(),
    leaderboardOptIn: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_usernameLower", ["usernameLower"])
    .searchIndex("search_displayName", {
      searchField: "displayName",
      filterFields: ["isPublic"],
    }),

  // ── Personal Records ─────────────────────────────────────────────────────
  // Stores the current best for each exercise × PR type per user (D044).
  // PR detection runs inside `logSet` and upserts into this table.
  personalRecords: defineTable({
    userId: v.string(),
    exerciseId: v.id("exercises"),
    type: prType,
    value: v.number(),
    setId: v.id("sets"),
    workoutId: v.id("workouts"),
    achievedAt: v.number(),
  })
    .index("by_userId_exerciseId", ["userId", "exerciseId"])
    .index("by_workoutId", ["workoutId"]),

  // ── Social: Follows ────────────────────────────────────────────────────────
  follows: defineTable({
    followerId: v.string(),
    followingId: v.string(),
    createdAt: v.number(),
  })
    .index("by_followerId", ["followerId"])
    .index("by_followingId", ["followingId"])
    .index("by_pair", ["followerId", "followingId"]),

  // ── Social: Feed Items ─────────────────────────────────────────────────────
  // Denormalized event rows created on workout completion (D070/D074).
  feedItems: defineTable({
    authorId: v.string(),
    type: feedItemType,
    workoutId: v.id("workouts"),
    summary: v.object({
      name: v.string(),
      durationSeconds: v.number(),
      exerciseCount: v.number(),
      prCount: v.number(),
    }),
    isPublic: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_authorId_createdAt", ["authorId", "createdAt"])
    .index("by_workoutId", ["workoutId"]),

  // ── Social: Reactions ──────────────────────────────────────────────────────
  reactions: defineTable({
    feedItemId: v.id("feedItems"),
    userId: v.string(),
    type: reactionType,
    createdAt: v.number(),
  })
    .index("by_feedItemId", ["feedItemId"])
    .index("by_feedItemId_userId_type", ["feedItemId", "userId", "type"]),

  // ── Social: Blocks ─────────────────────────────────────────────────────────
  blocks: defineTable({
    blockerId: v.string(),
    blockedId: v.string(),
    createdAt: v.number(),
  })
    .index("by_blockerId", ["blockerId"])
    .index("by_blockedId", ["blockedId"])
    .index("by_pair", ["blockerId", "blockedId"]),

  // ── Social: Reports ────────────────────────────────────────────────────────
  reports: defineTable({
    reporterId: v.string(),
    targetType: reportTargetType,
    targetId: v.string(),
    reason: v.string(),
    createdAt: v.number(),
  }).index("by_reporterId", ["reporterId"]),

  // ── Leaderboard Entries ────────────────────────────────────────────────────
  // Pre-computed per-exercise rankings updated on workout completion (D108).
  // Opt-in filtering happens at query time, not at write time.
  leaderboardEntries: defineTable({
    userId: v.string(),
    exerciseId: v.id("exercises"),
    metric: leaderboardMetric,
    period: v.literal("allTime"),
    value: v.number(),
    workoutId: v.id("workouts"),
    updatedAt: v.number(),
  })
    .index("by_exerciseId_metric_period_value", [
      "exerciseId",
      "metric",
      "period",
      "value",
    ])
    .index("by_userId", ["userId"]),

  // ── Challenges ──────────────────────────────────────────────────────────
  // Time-limited group challenges with lifecycle: pending → active → completed/cancelled.
  challenges: defineTable({
    creatorId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    type: challengeType,
    exerciseId: v.optional(v.id("exercises")),
    status: challengeStatus,
    startAt: v.number(),
    endAt: v.number(),
    winnerId: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    scheduledCompletionId: v.optional(v.id("_scheduled_functions")),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_creatorId", ["creatorId"]),

  // ── Challenge Participants ──────────────────────────────────────────────
  // Tracks each user's participation and running score in a challenge.
  challengeParticipants: defineTable({
    challengeId: v.id("challenges"),
    userId: v.string(),
    currentValue: v.number(),
    joinedAt: v.number(),
  })
    .index("by_challengeId_currentValue", ["challengeId", "currentValue"])
    .index("by_userId", ["userId"])
    .index("by_challengeId_userId", ["challengeId", "userId"]),
});
