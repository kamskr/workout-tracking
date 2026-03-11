"use client";

import Link from "next/link";
import TemplateList from "@/components/templates/TemplateList";
import { Button } from "@/components/common/button";

export default function TemplatesPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Workout Templates
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Reusable workout plans to get you started quickly.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/workouts">View History</Link>
          </Button>
        </div>
        <TemplateList />
      </div>
    </main>
  );
}
