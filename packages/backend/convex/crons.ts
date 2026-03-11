import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check challenge deadlines",
  { minutes: 15 },
  internal.challenges.checkDeadlines,
);

crons.interval(
  "cleanup session presence",
  { seconds: 30 },
  internal.sessions.cleanupPresence,
);

crons.interval(
  "check session timeouts",
  { minutes: 5 },
  internal.sessions.checkSessionTimeouts,
);

export default crons;
