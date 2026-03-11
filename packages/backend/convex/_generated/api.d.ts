/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as exercises from "../exercises.js";
import type * as lib_auth from "../lib/auth.js";
import type * as notes from "../notes.js";
import type * as openai from "../openai.js";
import type * as seed from "../seed.js";
import type * as sets from "../sets.js";
import type * as testing from "../testing.js";
import type * as userPreferences from "../userPreferences.js";
import type * as utils from "../utils.js";
import type * as workoutExercises from "../workoutExercises.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  exercises: typeof exercises;
  "lib/auth": typeof lib_auth;
  notes: typeof notes;
  openai: typeof openai;
  seed: typeof seed;
  sets: typeof sets;
  testing: typeof testing;
  userPreferences: typeof userPreferences;
  utils: typeof utils;
  workoutExercises: typeof workoutExercises;
  workouts: typeof workouts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
