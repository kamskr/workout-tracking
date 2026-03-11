import { cn } from "@/lib/utils";

/** Shape returned by the listExercises query. */
interface Exercise {
  _id: string;
  name: string;
  primaryMuscleGroup: string;
  equipment: string;
  exerciseType: string;
}

interface ExerciseCardProps {
  exercise: Exercise;
}

const BADGE_COLORS: Record<string, string> = {
  // Muscle groups
  chest: "bg-blue-50 text-blue-700",
  back: "bg-indigo-50 text-indigo-700",
  shoulders: "bg-purple-50 text-purple-700",
  biceps: "bg-pink-50 text-pink-700",
  triceps: "bg-rose-50 text-rose-700",
  legs: "bg-green-50 text-green-700",
  core: "bg-yellow-50 text-yellow-700",
  fullBody: "bg-teal-50 text-teal-700",
  cardio: "bg-orange-50 text-orange-700",
  // Equipment
  barbell: "bg-slate-50 text-slate-700",
  dumbbell: "bg-gray-50 text-gray-700",
  cable: "bg-zinc-50 text-zinc-700",
  machine: "bg-stone-50 text-stone-700",
  bodyweight: "bg-emerald-50 text-emerald-700",
  kettlebell: "bg-amber-50 text-amber-700",
  bands: "bg-lime-50 text-lime-700",
  other: "bg-neutral-50 text-neutral-700",
  // Exercise types
  strength: "bg-sky-50 text-sky-700",
  stretch: "bg-violet-50 text-violet-700",
  plyometric: "bg-fuchsia-50 text-fuchsia-700",
};

function Badge({ label }: { label: string }) {
  const colors = BADGE_COLORS[label] ?? "bg-gray-50 text-gray-600";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        colors,
      )}
    >
      {formatLabel(label)}
    </span>
  );
}

/** Converts camelCase enum values to human-readable labels. */
function formatLabel(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

export default function ExerciseCard({ exercise }: ExerciseCardProps) {
  return (
    <div
      className={cn(
        "group rounded-xl border border-gray-200 bg-white p-4 shadow-sm",
        "transition-all hover:border-gray-300 hover:shadow-md",
      )}
    >
      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">
        {exercise.name}
      </h3>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge label={exercise.primaryMuscleGroup} />
        <Badge label={exercise.equipment} />
        <Badge label={exercise.exerciseType} />
      </div>
    </div>
  );
}
