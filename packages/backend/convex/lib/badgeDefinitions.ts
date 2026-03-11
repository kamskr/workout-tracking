/**
 * Badge definitions — framework-agnostic TypeScript constants.
 *
 * Defines all achievement badges available in the system. Each badge has a
 * threshold-based trigger: when a user's aggregate stat meets or exceeds the
 * threshold, the badge is awarded.
 *
 * Categories:
 *   - workoutCount: Total completed workouts
 *   - volume:       Total lifted volume in kg (all-time)
 *   - streak:       Current consecutive workout-day streak
 *   - pr:           Total personal records achieved
 *   - challenge:    Total challenges completed
 *
 * This file has zero runtime dependencies on Convex or React — it is pure
 * TypeScript data that can be imported anywhere.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type BadgeCategory =
  | "workoutCount"
  | "volume"
  | "streak"
  | "pr"
  | "challenge";

export interface BadgeDefinition {
  /** Unique slug used as the primary key for deduplication */
  slug: string;
  /** Human-readable badge name */
  name: string;
  /** Emoji icon displayed alongside the badge */
  emoji: string;
  /** Short description of how to earn this badge */
  description: string;
  /** Badge category for grouping/filtering */
  category: BadgeCategory;
  /** Which aggregate stat to compare against the threshold */
  statKey: string;
  /** Minimum stat value required to earn this badge */
  threshold: number;
}

// ── Badge Definitions ────────────────────────────────────────────────────────

export const BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  // ── Workout Count (5) ──────────────────────────────────────────────────
  {
    slug: "first_workout",
    name: "First Step",
    emoji: "👟",
    description: "Complete your first workout",
    category: "workoutCount",
    statKey: "workoutCount",
    threshold: 1,
  },
  {
    slug: "ten_workouts",
    name: "Dedicated Lifter",
    emoji: "💪",
    description: "Complete 10 workouts",
    category: "workoutCount",
    statKey: "workoutCount",
    threshold: 10,
  },
  {
    slug: "twenty_five_workouts",
    name: "Quarter Century",
    emoji: "🏋️",
    description: "Complete 25 workouts",
    category: "workoutCount",
    statKey: "workoutCount",
    threshold: 25,
  },
  {
    slug: "fifty_workouts",
    name: "Half Century",
    emoji: "⭐",
    description: "Complete 50 workouts",
    category: "workoutCount",
    statKey: "workoutCount",
    threshold: 50,
  },
  {
    slug: "hundred_workouts",
    name: "Centurion",
    emoji: "🏆",
    description: "Complete 100 workouts",
    category: "workoutCount",
    statKey: "workoutCount",
    threshold: 100,
  },

  // ── Volume (3) ─────────────────────────────────────────────────────────
  {
    slug: "volume_10k",
    name: "Ten Tonner",
    emoji: "🪨",
    description: "Lift a total of 10,000 kg",
    category: "volume",
    statKey: "totalVolume",
    threshold: 10_000,
  },
  {
    slug: "volume_100k",
    name: "Iron Mountain",
    emoji: "⛰️",
    description: "Lift a total of 100,000 kg",
    category: "volume",
    statKey: "totalVolume",
    threshold: 100_000,
  },
  {
    slug: "volume_1m",
    name: "Million Pound Club",
    emoji: "🌋",
    description: "Lift a total of 1,000,000 kg",
    category: "volume",
    statKey: "totalVolume",
    threshold: 1_000_000,
  },

  // ── Streak (3) ─────────────────────────────────────────────────────────
  {
    slug: "streak_3",
    name: "Hat Trick",
    emoji: "🔥",
    description: "Maintain a 3-day workout streak",
    category: "streak",
    statKey: "currentStreak",
    threshold: 3,
  },
  {
    slug: "streak_7",
    name: "Week Warrior",
    emoji: "📅",
    description: "Maintain a 7-day workout streak",
    category: "streak",
    statKey: "currentStreak",
    threshold: 7,
  },
  {
    slug: "streak_30",
    name: "Iron Will",
    emoji: "🔱",
    description: "Maintain a 30-day workout streak",
    category: "streak",
    statKey: "currentStreak",
    threshold: 30,
  },

  // ── Personal Records (2) ───────────────────────────────────────────────
  {
    slug: "first_pr",
    name: "Record Breaker",
    emoji: "📈",
    description: "Achieve your first personal record",
    category: "pr",
    statKey: "prCount",
    threshold: 1,
  },
  {
    slug: "ten_prs",
    name: "PR Machine",
    emoji: "🎯",
    description: "Achieve 10 personal records",
    category: "pr",
    statKey: "prCount",
    threshold: 10,
  },

  // ── Challenges (2) ─────────────────────────────────────────────────────
  {
    slug: "first_challenge",
    name: "Challenger",
    emoji: "⚔️",
    description: "Complete your first challenge",
    category: "challenge",
    statKey: "completedChallengeCount",
    threshold: 1,
  },
  {
    slug: "five_challenges",
    name: "Champion",
    emoji: "👑",
    description: "Complete 5 challenges",
    category: "challenge",
    statKey: "completedChallengeCount",
    threshold: 5,
  },
] as const;
