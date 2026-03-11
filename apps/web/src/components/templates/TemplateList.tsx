"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import TemplateCard from "./TemplateCard";

export default function TemplateList() {
  const templates = useQuery(api.templates.listTemplates);

  const isLoading = templates === undefined;
  const isEmpty = templates !== undefined && templates.length === 0;

  return (
    <div className="space-y-6">
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-gray-400">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm font-medium">Loading templates…</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-gray-100 p-3 mb-3">
            <svg
              className="h-6 w-6 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">No templates yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Save a workout as a template to get started.
          </p>
        </div>
      )}

      {/* Template grid */}
      {templates && templates.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard key={template._id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
