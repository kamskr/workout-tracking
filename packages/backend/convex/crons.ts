import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check challenge deadlines",
  { minutes: 15 },
  internal.challenges.checkDeadlines,
);

export default crons;
