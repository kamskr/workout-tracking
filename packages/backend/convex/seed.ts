import { internalMutation } from "./_generated/server";
import exercisesData from "../data/exercises.json";

/**
 * Idempotent seed mutation for the exercises table.
 * Checks each exercise by slug before inserting — running twice produces no duplicates.
 *
 * Observability: Logs inserted/skipped/total counts to Convex function logs.
 */
export const seedExercises = internalMutation({
  args: {},
  handler: async (ctx) => {
    const total = exercisesData.length;
    let inserted = 0;
    let skipped = 0;

    for (const exercise of exercisesData) {
      // Check existence by slug using the by_slug index
      const existing = await ctx.db
        .query("exercises")
        .withIndex("by_slug", (q) => q.eq("slug", exercise.slug))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("exercises", {
        name: exercise.name,
        slug: exercise.slug,
        primaryMuscleGroup: exercise.primaryMuscleGroup as any,
        secondaryMuscleGroups: exercise.secondaryMuscleGroups as any,
        equipment: exercise.equipment as any,
        exerciseType: exercise.exerciseType as any,
        instructions: exercise.instructions,
        isCustom: false,
        defaultRestSeconds: exercise.defaultRestSeconds,
      });

      inserted++;
    }

    console.log(
      `Seed complete: ${inserted} inserted, ${skipped} skipped of ${total}`,
    );
  },
});
