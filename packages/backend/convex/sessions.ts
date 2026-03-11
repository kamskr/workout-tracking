/**
 * Group workout sessions: real-time collaborative workouts with invite codes,
 * participant presence tracking, shared timer, session lifecycle, and combined summary.
 *
 * Mutations: createSession, joinSession, leaveSession, sendHeartbeat,
 *            startSharedTimer, pauseSharedTimer, skipSharedTimer, endSession
 * Queries: getSession, getSessionByInviteCode, getSessionParticipants, getSessionSets,
 *          getSessionSummary
 * Internal: cleanupPresence, checkSessionTimeouts (cron-driven)
 */

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./lib/auth";

// ── Constants ────────────────────────────────────────────────────────────────

/** Unambiguous charset — no 0/O/1/I confusion */
const INVITE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 6;
const MAX_PARTICIPANTS = 10;
const HEARTBEAT_TIMEOUT_MS = 30_000; // 30 seconds

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CHARSET[Math.floor(Math.random() * INVITE_CHARSET.length)];
  }
  return code;
}

// ══════════════════════════════════════════════════════════════════════════════
// Mutations
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new group workout session.
 *
 * Generates a 6-char invite code with collision retry, creates the session,
 * auto-joins the host as first participant, and creates a workout for the host.
 * Returns { sessionId, inviteCode }.
 */
export const createSession = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();

    // Generate invite code with collision retry
    let inviteCode: string;
    let attempts = 0;
    do {
      inviteCode = generateInviteCode();
      const existing = await ctx.db
        .query("groupSessions")
        .withIndex("by_inviteCode", (q) => q.eq("inviteCode", inviteCode))
        .first();
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error("Failed to generate unique invite code after 10 attempts");
    }

    // Create session
    const sessionId = await ctx.db.insert("groupSessions", {
      hostId: userId,
      status: "waiting",
      inviteCode,
      createdAt: now,
    });

    // Create workout for host
    const workoutId = await ctx.db.insert("workouts", {
      userId,
      name: "Group Session",
      status: "inProgress",
      startedAt: now,
      sessionId,
    });

    // Create participant entry for host
    await ctx.db.insert("sessionParticipants", {
      sessionId,
      userId,
      workoutId,
      lastHeartbeatAt: now,
      status: "active",
      joinedAt: now,
    });

    console.log(
      `[Session] createSession(${sessionId}): created by ${userId}, inviteCode=${inviteCode}`,
    );

    return { sessionId, inviteCode };
  },
});

/**
 * Join an existing group session by invite code or session ID.
 *
 * Idempotent — returns existing participant data if already joined.
 * Transitions session from "waiting" → "active" on first non-host join.
 * Enforces participant cap of 10.
 */
export const joinSession = mutation({
  args: {
    inviteCode: v.optional(v.string()),
    sessionId: v.optional(v.id("groupSessions")),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (!args.inviteCode && !args.sessionId) {
      throw new Error("Either inviteCode or sessionId is required");
    }

    // Look up session
    let session;
    if (args.sessionId) {
      session = await ctx.db.get(args.sessionId);
    } else {
      session = await ctx.db
        .query("groupSessions")
        .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode!))
        .first();
    }

    if (!session) throw new Error("Session not found");

    // Validate session is joinable (D148: allow late join for "active")
    if (session.status !== "waiting" && session.status !== "active") {
      throw new Error(
        `Session is not joinable (status: ${session.status})`,
      );
    }

    // Dedup check via by_sessionId_userId index
    const existing = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_sessionId_userId", (q) =>
        q.eq("sessionId", session!._id).eq("userId", userId),
      )
      .first();

    if (existing) {
      // Idempotent — return existing data
      console.log(
        `[Session] joinSession(${session._id}): ${userId} already joined (idempotent)`,
      );
      return {
        sessionId: session._id,
        participantId: existing._id,
        workoutId: existing.workoutId,
      };
    }

    // Check participant cap (D147)
    const participants = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session!._id))
      .collect();

    if (participants.length >= MAX_PARTICIPANTS) {
      throw new Error("Session full (max 10 participants)");
    }

    const now = Date.now();

    // Create workout for joining participant
    const workoutId = await ctx.db.insert("workouts", {
      userId,
      name: "Group Session",
      status: "inProgress",
      startedAt: now,
      sessionId: session._id,
    });

    // Create participant entry
    const participantId = await ctx.db.insert("sessionParticipants", {
      sessionId: session._id,
      userId,
      workoutId,
      lastHeartbeatAt: now,
      status: "active",
      joinedAt: now,
    });

    // Transition "waiting" → "active" on first non-host join
    if (session.status === "waiting" && userId !== session.hostId) {
      await ctx.db.patch(session._id, { status: "active" });
      console.log(
        `[Session] joinSession(${session._id}): transitioned waiting → active`,
      );
    }

    console.log(
      `[Session] joinSession(${session._id}): ${userId} joined (${participants.length + 1} participants)`,
    );

    return { sessionId: session._id, participantId, workoutId };
  },
});

/**
 * Leave a group session. Host cannot leave (must end session via S02).
 * Marks participant status as "left".
 */
export const leaveSession = mutation({
  args: {
    sessionId: v.id("groupSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.hostId === userId) {
      throw new Error("Host cannot leave session");
    }

    const participant = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_sessionId_userId", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", userId),
      )
      .first();

    if (!participant) {
      throw new Error("Not a participant");
    }

    await ctx.db.patch(participant._id, { status: "left" });

    console.log(
      `[Session] leaveSession(${args.sessionId}): ${userId} left`,
    );
  },
});

/**
 * Send a heartbeat to maintain active presence in a session.
 * Minimal work — just patches lastHeartbeatAt on the participant doc.
 */
export const sendHeartbeat = mutation({
  args: {
    sessionId: v.id("groupSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const participant = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_sessionId_userId", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", userId),
      )
      .first();

    if (!participant) {
      console.error(
        `[Session] sendHeartbeat(${args.sessionId}): ${userId} not found as participant`,
      );
      throw new Error("Not a participant");
    }

    await ctx.db.patch(participant._id, {
      lastHeartbeatAt: Date.now(),
      status: "active",
    });
  },
});

/**
 * Start a shared rest timer visible to all session participants.
 *
 * Any participant can call (D140). Sets sharedTimerEndAt and sharedTimerDurationSeconds
 * on the session doc for real-time sync.
 */
export const startSharedTimer = mutation({
  args: {
    sessionId: v.id("groupSessions"),
    durationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Validate participant membership
    const participant = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_sessionId_userId", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", userId),
      )
      .first();

    if (!participant || participant.status === "left") {
      throw new Error("Not an active participant");
    }

    await ctx.db.patch(args.sessionId, {
      sharedTimerEndAt: Date.now() + args.durationSeconds * 1000,
      sharedTimerDurationSeconds: args.durationSeconds,
    });

    console.log(
      `[Session] startSharedTimer(${args.sessionId}): ${userId} started ${args.durationSeconds}s timer`,
    );
  },
});

/**
 * Pause the shared rest timer — clears the countdown but keeps duration for UI default.
 *
 * Any participant can call.
 */
export const pauseSharedTimer = mutation({
  args: {
    sessionId: v.id("groupSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Validate participant membership
    const participant = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_sessionId_userId", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", userId),
      )
      .first();

    if (!participant || participant.status === "left") {
      throw new Error("Not an active participant");
    }

    await ctx.db.patch(args.sessionId, {
      sharedTimerEndAt: undefined,
    });

    console.log(
      `[Session] pauseSharedTimer(${args.sessionId}): ${userId} paused timer`,
    );
  },
});

/**
 * Skip the shared rest timer — semantically "skip rest", clears countdown.
 *
 * Any participant can call.
 */
export const skipSharedTimer = mutation({
  args: {
    sessionId: v.id("groupSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Validate participant membership
    const participant = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_sessionId_userId", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", userId),
      )
      .first();

    if (!participant || participant.status === "left") {
      throw new Error("Not an active participant");
    }

    await ctx.db.patch(args.sessionId, {
      sharedTimerEndAt: undefined,
    });

    console.log(
      `[Session] skipSharedTimer(${args.sessionId}): ${userId} skipped timer`,
    );
  },
});

/**
 * End a group session. Host-only.
 *
 * Idempotent: returns early (no error) if already completed.
 * Patches session to completed, clears timer, and marks all non-"left"
 * participants as "left". Follows completeChallenge pattern (D111).
 */
export const endSession = mutation({
  args: {
    sessionId: v.id("groupSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Host-only check
    if (session.hostId !== userId) {
      console.log(
        `[Session] endSession(${args.sessionId}): rejected — ${userId} is not host`,
      );
      throw new Error("Only the host can end the session");
    }

    // Idempotent: already completed → return early
    if (session.status === "completed") {
      console.log(
        `[Session] endSession(${args.sessionId}): already completed, skipping`,
      );
      return;
    }

    const now = Date.now();

    // Patch session to completed
    await ctx.db.patch(args.sessionId, {
      status: "completed",
      completedAt: now,
      sharedTimerEndAt: undefined,
    });

    // Mark all non-"left" participants as "left"
    const participants = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const p of participants) {
      if (p.status !== "left") {
        await ctx.db.patch(p._id, { status: "left" });
      }
    }

    console.log(
      `[Session] endSession(${args.sessionId}): completed by host ${userId}, ${participants.length} participants marked left`,
    );
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// Queries
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get a session by ID, enriched with participant count and host profile info.
 */
export const getSession = query({
  args: {
    sessionId: v.id("groupSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    const participants = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const hostProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", session.hostId))
      .first();

    return {
      ...session,
      participantCount: participants.length,
      host: {
        displayName: hostProfile?.displayName ?? session.hostId,
        username: hostProfile?.username ?? session.hostId,
        avatarUrl: hostProfile?.avatarStorageId ?? null,
      },
    };
  },
});

/**
 * Get a session by invite code, enriched with participant count and host profile.
 * Used by join page to display session info before joining.
 */
export const getSessionByInviteCode = query({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db
      .query("groupSessions")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!session) throw new Error("Session not found");

    const participants = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
      .collect();

    const hostProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", session.hostId))
      .first();

    return {
      ...session,
      participantCount: participants.length,
      host: {
        displayName: hostProfile?.displayName ?? session.hostId,
        username: hostProfile?.username ?? session.hostId,
        avatarUrl: hostProfile?.avatarStorageId ?? null,
      },
    };
  },
});

/**
 * Get session participants with profile enrichment and derived presence status.
 *
 * Presence derivation: if lastHeartbeatAt is within 30s → "active",
 * otherwise uses the stored status value.
 */
export const getSessionParticipants = query({
  args: {
    sessionId: v.id("groupSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const participants = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const now = Date.now();

    return await Promise.all(
      participants.map(async (p) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", p.userId))
          .first();

        // Derive presence: active if heartbeat within 30s, else stored status
        const derivedStatus =
          p.status !== "left" && now - p.lastHeartbeatAt <= HEARTBEAT_TIMEOUT_MS
            ? "active"
            : p.status;

        return {
          ...p,
          displayName: profile?.displayName ?? p.userId,
          username: profile?.username ?? p.userId,
          avatarUrl: profile?.avatarStorageId ?? null,
          derivedStatus,
        };
      }),
    );
  },
});

/**
 * Get all sets logged in a session, grouped by participant then by exercise.
 *
 * Traversal: workouts (by_sessionId) → workoutExercises (by_workoutId) → sets (by_workoutExerciseId)
 * Does NOT read from sessionParticipants table.
 */
export const getSessionSets = query({
  args: {
    sessionId: v.id("groupSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get all workouts in this session
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // For each workout (participant), get exercises and sets
    const participantSets = await Promise.all(
      workouts.map(async (workout) => {
        // Get participant profile for display name
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", workout.userId))
          .first();

        const workoutExercises = await ctx.db
          .query("workoutExercises")
          .withIndex("by_workoutId", (q) => q.eq("workoutId", workout._id))
          .collect();

        const exercises = await Promise.all(
          workoutExercises.map(async (we) => {
            const [exercise, sets] = await Promise.all([
              ctx.db.get(we.exerciseId),
              ctx.db
                .query("sets")
                .withIndex("by_workoutExerciseId", (q) =>
                  q.eq("workoutExerciseId", we._id),
                )
                .collect(),
            ]);

            return {
              workoutExerciseId: we._id,
              exerciseName: exercise?.name ?? "Unknown Exercise",
              exerciseId: we.exerciseId,
              order: we.order,
              sets,
            };
          }),
        );

        return {
          participantUserId: workout.userId,
          participantName: profile?.displayName ?? workout.userId,
          workoutId: workout._id,
          exercises,
        };
      }),
    );

    return participantSets;
  },
});

/**
 * Get a combined summary of a completed (or in-progress) session.
 *
 * Aggregates per-participant stats: exerciseCount, setCount, totalVolume,
 * durationSeconds. Returns session metadata + array of participant summaries.
 */
export const getSessionSummary = query({
  args: {
    sessionId: v.id("groupSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Get all workouts in this session
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const now = Date.now();

    // Build per-participant summaries
    const participantSummaries = await Promise.all(
      workouts.map(async (workout) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", workout.userId))
          .first();

        const workoutExercises = await ctx.db
          .query("workoutExercises")
          .withIndex("by_workoutId", (q) => q.eq("workoutId", workout._id))
          .collect();

        let setCount = 0;
        let totalVolume = 0;

        for (const we of workoutExercises) {
          const sets = await ctx.db
            .query("sets")
            .withIndex("by_workoutExerciseId", (q) =>
              q.eq("workoutExerciseId", we._id),
            )
            .collect();

          setCount += sets.length;

          for (const s of sets) {
            // Sum weight * reps for non-warmup sets
            if (!s.isWarmup && s.weight != null && s.reps != null) {
              totalVolume += s.weight * s.reps;
            }
          }
        }

        // Duration: completedAt or now minus startedAt
        const endTime = workout.completedAt ?? now;
        const durationSeconds = workout.startedAt
          ? Math.round((endTime - workout.startedAt) / 1000)
          : 0;

        return {
          userId: workout.userId,
          displayName: profile?.displayName ?? workout.userId,
          exerciseCount: workoutExercises.length,
          setCount,
          totalVolume,
          durationSeconds,
        };
      }),
    );

    return {
      sessionId: session._id,
      hostId: session.hostId,
      status: session.status,
      createdAt: session.createdAt,
      completedAt: session.completedAt ?? null,
      participantSummaries,
    };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// Internal mutations (cron-driven)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Cleanup stale presence: marks participants as "idle" if their heartbeat
 * is older than 30 seconds. Runs on a 30-second cron interval.
 *
 * Scans "waiting" and "active" sessions, bounded with .take(1000) safety.
 */
export const cleanupPresence = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const threshold = now - HEARTBEAT_TIMEOUT_MS;
    let idleCount = 0;
    let sessionsScanned = 0;

    // Query active sessions (both "waiting" and "active")
    const waitingSessions = await ctx.db
      .query("groupSessions")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .take(1000);

    const activeSessions = await ctx.db
      .query("groupSessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(1000);

    const sessions = [...waitingSessions, ...activeSessions];
    sessionsScanned = sessions.length;

    for (const session of sessions) {
      const participants = await ctx.db
        .query("sessionParticipants")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const p of participants) {
        if (p.status === "active" && p.lastHeartbeatAt < threshold) {
          await ctx.db.patch(p._id, { status: "idle" });
          idleCount++;
        }
      }
    }

    console.log(
      `[Session] cleanupPresence: scanned ${sessionsScanned} sessions, marked ${idleCount} participants idle`,
    );
  },
});

/** 15-minute inactivity timeout threshold for session auto-completion */
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Auto-complete abandoned sessions where ALL participants have stale heartbeats
 * for 15+ minutes AND the session was created 15+ minutes ago.
 *
 * Runs on a 5-minute cron interval. Per-session try/catch for resilience.
 */
export const checkSessionTimeouts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const staleThreshold = now - SESSION_TIMEOUT_MS;
    let sessionsScanned = 0;
    let autoCompletedCount = 0;

    // Query waiting and active sessions
    const waitingSessions = await ctx.db
      .query("groupSessions")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .take(1000);

    const activeSessions = await ctx.db
      .query("groupSessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(1000);

    const sessions = [...waitingSessions, ...activeSessions];
    sessionsScanned = sessions.length;

    for (const session of sessions) {
      try {
        // Session must be created 15+ minutes ago
        if (session.createdAt >= staleThreshold) {
          continue;
        }

        const participants = await ctx.db
          .query("sessionParticipants")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
          .collect();

        // ALL participants must have stale heartbeats (15+ minutes)
        const allStale = participants.length > 0 && participants.every(
          (p) => p.lastHeartbeatAt < staleThreshold,
        );

        if (allStale) {
          await ctx.db.patch(session._id, {
            status: "completed",
            completedAt: now,
          });
          autoCompletedCount++;
        }
      } catch (error) {
        console.error(
          `[Session] checkSessionTimeouts: error processing session ${session._id}:`,
          error,
        );
      }
    }

    console.log(
      `[Session] checkSessionTimeouts: scanned ${sessionsScanned} sessions, auto-completed ${autoCompletedCount}`,
    );
  },
});
