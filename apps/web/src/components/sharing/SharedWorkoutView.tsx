"use client";

import Link from "next/link";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/common/avatar";
import { formatDuration } from "@/lib/units";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface SetData {
  _id: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  isCompleted?: boolean;
}

interface ExerciseData {
  _id: string;
  name: string;
}

interface WorkoutExerciseData {
  _id: string;
  order: number;
}

interface SharedWorkoutData {
  workout: {
    _id: string;
    name?: string;
    status: string;
    startedAt?: number;
    completedAt?: number;
    durationSeconds?: number;
  };
  exercises: Array<{
    workoutExercise: WorkoutExerciseData;
    exercise: ExerciseData | null;
    sets: SetData[];
  }>;
  author: {
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
  feedItem: {
    _id: string;
    summary?: {
      prCount?: number;
    };
  };
}

interface SharedWorkoutViewProps {
  data: SharedWorkoutData;
}

export default function SharedWorkoutView({ data }: SharedWorkoutViewProps) {
  const { workout, exercises, author, feedItem } = data;
  const prCount = feedItem.summary?.prCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Author header */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${author.username}`}>
            <Avatar className="h-12 w-12 text-sm">
              {author.avatarUrl ? (
                <AvatarImage src={author.avatarUrl} alt={author.displayName} />
              ) : null}
              <AvatarFallback>{getInitials(author.displayName)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              href={`/profile/${author.username}`}
              className="text-sm font-semibold text-gray-900 hover:underline"
            >
              {author.displayName}
            </Link>
            <Link
              href={`/profile/${author.username}`}
              className="block text-xs text-gray-500 hover:underline"
            >
              @{author.username}
            </Link>
          </div>
        </div>
      </div>

      {/* Workout summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          {workout.name || "Workout"}
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          {workout.durationSeconds != null && (
            <span className="inline-flex items-center gap-1.5">
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              {formatDuration(workout.durationSeconds)}
            </span>
          )}

          {workout.completedAt && (
            <span>{formatDate(workout.completedAt)}</span>
          )}

          <span>
            {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
          </span>

          {prCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              🏆 {prCount} PR{prCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        {exercises.map(({ workoutExercise, exercise, sets }) => (
          <div
            key={workoutExercise._id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                {exercise?.name ?? "Unknown Exercise"}
              </h3>
              <span className="text-xs text-gray-400">
                {sets.length} set{sets.length !== 1 ? "s" : ""}
              </span>
            </div>

            {sets.length > 0 && (
              <div className="mt-3">
                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-400 px-1 mb-1.5">
                  <span>Set</span>
                  <span>Weight</span>
                  <span>Reps</span>
                </div>
                <div className="space-y-1">
                  {sets.map((set) => (
                    <div
                      key={set._id}
                      className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 px-2 py-1.5 text-sm text-gray-700"
                    >
                      <span className="font-medium text-gray-500">
                        {set.setNumber}
                      </span>
                      <span>
                        {set.weight != null ? `${set.weight} kg` : "—"}
                      </span>
                      <span>{set.reps != null ? set.reps : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
