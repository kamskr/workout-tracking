/**
 * Shared SVG path data for muscle group heatmap.
 *
 * Framework-agnostic — no React/JSX imports.
 * Consumed by:
 *  - apps/web  via @packages/backend/data/muscle-heatmap-paths (inline <svg>)
 *  - apps/mobile via react-native-svg (S04)
 */

// ── ViewBox ──────────────────────────────────────────────────────────────────

/** Width of a single body view (front or back). */
export const VIEW_WIDTH = 200;

/** Height of a single body view. */
export const VIEW_HEIGHT = 400;

/** ViewBox string for a single body view. */
export const VIEWBOX = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;

// ── Types ────────────────────────────────────────────────────────────────────

export interface MuscleRegion {
  /** Matches schema muscleGroup value (chest, back, shoulders, etc.) */
  id: string;
  /** Human-readable label */
  label: string;
  /** One or more SVG path `d` attribute strings */
  paths: string[];
  /** Which body view this region appears in */
  view: "front" | "back";
}

// ── Body Outline Paths ───────────────────────────────────────────────────────
// Non-interactive silhouette outlines (front and back).

export const BODY_OUTLINE_FRONT: string[] = [
  // Head
  "M90,30 Q90,10 100,10 Q110,10 110,30 Q110,45 100,48 Q90,45 90,30 Z",
  // Neck
  "M95,48 L95,58 L105,58 L105,48 Z",
  // Torso
  "M70,58 L60,70 L55,120 L60,180 L75,190 L100,195 L125,190 L140,180 L145,120 L140,70 L130,58 Z",
  // Left arm
  "M55,70 L42,75 L35,120 L32,170 L38,172 L45,125 L55,80 Z",
  // Right arm
  "M145,70 L158,75 L165,120 L168,170 L162,172 L155,125 L145,80 Z",
  // Left hand
  "M30,170 Q28,182 32,185 L38,178 Z",
  // Right hand
  "M170,170 Q172,182 168,185 L162,178 Z",
  // Left leg
  "M75,190 L70,260 L65,340 L60,380 L80,380 L82,340 L85,260 L100,195 Z",
  // Right leg
  "M125,190 L130,260 L135,340 L140,380 L120,380 L118,340 L115,260 L100,195 Z",
];

export const BODY_OUTLINE_BACK: string[] = [
  // Head
  "M90,30 Q90,10 100,10 Q110,10 110,30 Q110,45 100,48 Q90,45 90,30 Z",
  // Neck
  "M95,48 L95,58 L105,58 L105,48 Z",
  // Torso
  "M70,58 L60,70 L55,120 L60,180 L75,190 L100,195 L125,190 L140,180 L145,120 L140,70 L130,58 Z",
  // Left arm
  "M55,70 L42,75 L35,120 L32,170 L38,172 L45,125 L55,80 Z",
  // Right arm
  "M145,70 L158,75 L165,120 L168,170 L162,172 L155,125 L145,80 Z",
  // Left hand
  "M30,170 Q28,182 32,185 L38,178 Z",
  // Right hand
  "M170,170 Q172,182 168,185 L162,178 Z",
  // Left leg
  "M75,190 L70,260 L65,340 L60,380 L80,380 L82,340 L85,260 L100,195 Z",
  // Right leg
  "M125,190 L130,260 L135,340 L140,380 L120,380 L118,340 L115,260 L100,195 Z",
];

// ── Muscle Region Definitions ────────────────────────────────────────────────
// Each region maps to a schema muscleGroup value.
// Paths are viewBox-relative and designed for clean geometric silhouettes.

export const MUSCLE_REGIONS: MuscleRegion[] = [
  // ─── Front view ──────────────────────────────────────────────────────────

  {
    id: "chest",
    label: "Chest",
    view: "front",
    paths: [
      // Left pec
      "M72,68 Q75,62 95,62 L98,68 L95,90 Q88,95 72,88 Z",
      // Right pec
      "M128,68 Q125,62 105,62 L102,68 L105,90 Q112,95 128,88 Z",
    ],
  },
  {
    id: "shoulders",
    label: "Shoulders",
    view: "front",
    paths: [
      // Left deltoid (front)
      "M60,62 Q55,68 54,80 L62,82 L72,68 L72,62 Z",
      // Right deltoid (front)
      "M140,62 Q145,68 146,80 L138,82 L128,68 L128,62 Z",
    ],
  },
  {
    id: "biceps",
    label: "Biceps",
    view: "front",
    paths: [
      // Left bicep
      "M50,85 L44,100 L42,120 L50,122 L56,105 L58,85 Z",
      // Right bicep
      "M150,85 L156,100 L158,120 L150,122 L144,105 L142,85 Z",
    ],
  },
  {
    id: "core",
    label: "Core",
    view: "front",
    paths: [
      // Abdominals
      "M82,95 L82,170 Q90,178 100,180 Q110,178 118,170 L118,95 Q110,100 100,102 Q90,100 82,95 Z",
    ],
  },
  {
    id: "legs",
    label: "Legs",
    view: "front",
    paths: [
      // Left quad
      "M76,192 L72,240 L68,300 L72,310 L85,310 L88,300 L90,240 L98,195 Q88,198 76,192 Z",
      // Right quad
      "M124,192 L128,240 L132,300 L128,310 L115,310 L112,300 L110,240 L102,195 Q112,198 124,192 Z",
    ],
  },

  // ─── Back view ───────────────────────────────────────────────────────────

  {
    id: "back",
    label: "Back",
    view: "back",
    paths: [
      // Upper back / lats
      "M72,62 L72,100 Q80,108 100,110 Q120,108 128,100 L128,62 Q120,58 100,58 Q80,58 72,62 Z",
      // Lower back
      "M78,112 L78,170 Q88,178 100,180 Q112,178 122,170 L122,112 Q112,115 100,116 Q88,115 78,112 Z",
    ],
  },
  {
    id: "shoulders",
    label: "Shoulders",
    view: "back",
    paths: [
      // Left rear deltoid
      "M60,62 Q55,68 54,80 L62,82 L72,68 L72,62 Z",
      // Right rear deltoid
      "M140,62 Q145,68 146,80 L138,82 L128,68 L128,62 Z",
    ],
  },
  {
    id: "triceps",
    label: "Triceps",
    view: "back",
    paths: [
      // Left tricep
      "M50,85 L44,100 L42,120 L50,122 L56,105 L58,85 Z",
      // Right tricep
      "M150,85 L156,100 L158,120 L150,122 L144,105 L142,85 Z",
    ],
  },
  {
    id: "legs",
    label: "Legs",
    view: "back",
    paths: [
      // Left hamstring / glute
      "M76,192 L72,240 L68,300 L72,310 L85,310 L88,300 L90,240 L98,195 Q88,198 76,192 Z",
      // Right hamstring / glute
      "M124,192 L128,240 L132,300 L128,310 L115,310 L112,300 L110,240 L102,195 Q112,198 124,192 Z",
    ],
  },
];
