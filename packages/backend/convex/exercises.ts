import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";

/** Maximum results returned by listExercises to prevent oversized responses. */
const MAX_RESULTS = 200;

// ── Re-export validators for args (matches schema.ts enum types) ─────────

const muscleGroupArg = v.union(
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

const equipmentArg = v.union(
  v.literal("barbell"),
  v.literal("dumbbell"),
  v.literal("cable"),
  v.literal("machine"),
  v.literal("bodyweight"),
  v.literal("kettlebell"),
  v.literal("bands"),
  v.literal("other"),
);

const exerciseTypeArg = v.union(
  v.literal("strength"),
  v.literal("cardio"),
  v.literal("bodyweight"),
  v.literal("stretch"),
  v.literal("plyometric"),
);

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * List exercises with optional filters.
 *
 * Routing:
 * - If searchQuery is provided → uses search index "search_name" with optional filter fields
 * - If only filter fields → uses the most selective index, applies remaining with .filter()
 * - If no filters → returns up to MAX_RESULTS exercises
 *
 * Never does a full-table .filter() scan — always starts from an index.
 */
export const listExercises = query({
  args: {
    searchQuery: v.optional(v.string()),
    primaryMuscleGroup: v.optional(muscleGroupArg),
    equipment: v.optional(equipmentArg),
    exerciseType: v.optional(exerciseTypeArg),
  },
  handler: async (ctx, args) => {
    const { searchQuery, primaryMuscleGroup, equipment, exerciseType } = args;

    // ── Path 1: Full-text search with optional filters ───────────────────
    if (searchQuery) {
      let searchBuilder = ctx.db
        .query("exercises")
        .withSearchIndex("search_name", (q) => {
          let sq = q.search("name", searchQuery);
          if (primaryMuscleGroup) sq = sq.eq("primaryMuscleGroup", primaryMuscleGroup);
          if (equipment) sq = sq.eq("equipment", equipment);
          if (exerciseType) sq = sq.eq("exerciseType", exerciseType);
          return sq;
        });

      // Search index results are already relevance-ranked; take up to limit
      return await searchBuilder.take(MAX_RESULTS);
    }

    // ── Path 2: Index-based filtering ────────────────────────────────────
    // Pick the first available indexed filter; apply the rest with .filter()

    if (primaryMuscleGroup) {
      let q = ctx.db
        .query("exercises")
        .withIndex("by_primaryMuscleGroup", (idx) =>
          idx.eq("primaryMuscleGroup", primaryMuscleGroup),
        );

      if (equipment) {
        q = q.filter((f) => f.eq(f.field("equipment"), equipment));
      }
      if (exerciseType) {
        q = q.filter((f) => f.eq(f.field("exerciseType"), exerciseType));
      }

      return await q.take(MAX_RESULTS);
    }

    if (equipment) {
      let q = ctx.db
        .query("exercises")
        .withIndex("by_equipment", (idx) => idx.eq("equipment", equipment));

      if (exerciseType) {
        q = q.filter((f) => f.eq(f.field("exerciseType"), exerciseType));
      }

      return await q.take(MAX_RESULTS);
    }

    if (exerciseType) {
      return await ctx.db
        .query("exercises")
        .withIndex("by_type", (idx) => idx.eq("exerciseType", exerciseType))
        .take(MAX_RESULTS);
    }

    // ── Path 3: No filters — list all (index order) ─────────────────────
    return await ctx.db.query("exercises").take(MAX_RESULTS);
  },
});

/**
 * Get a single exercise by ID.
 */
export const getExercise = query({
  args: { id: v.id("exercises") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a custom exercise. Auth-gated — throws if no authenticated user.
 */
export const createCustomExercise = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    primaryMuscleGroup: muscleGroupArg,
    secondaryMuscleGroups: v.array(muscleGroupArg),
    equipment: equipmentArg,
    exerciseType: exerciseTypeArg,
    instructions: v.optional(v.string()),
    defaultRestSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("User not found");

    const exerciseId = await ctx.db.insert("exercises", {
      ...args,
      isCustom: true,
      userId,
    });

    return exerciseId;
  },
});
