# S06: Mobile App & Cross-Platform Polish — UAT

**Milestone:** M001
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed
- Why this mode is sufficient: Artifact-driven verification (typecheck, backend verify scripts) confirms contract correctness across all packages. Live-runtime testing on Expo device/simulator is required for mobile UI behavior, touch interactions, timer UX, and cross-platform sync. Human-experience assessment is needed for gym-usability and design quality (R022).

## Preconditions

- Convex dev server running (`cd packages/backend && npx convex dev`) at http://127.0.0.1:3210
- Exercise data seeded (144 exercises — run seed if empty)
- Expo dev server running (`cd apps/native && npx expo start`)
- Expo Go or dev client installed on device/simulator
- A test user account available via Clerk OAuth (Google or Apple)
- Web app optionally running for cross-platform sync verification (`cd apps/web && pnpm dev`)

## Smoke Test

Launch the Expo app → sign in via Clerk OAuth → confirm 4-tab navigation appears (Exercises, Workouts, Templates, Settings) → tap Exercises tab → confirm exercise list loads with items.

## Test Cases

### 1. Auth-gated navigation

1. Launch app without being signed in
2. **Expected:** LoginScreen appears with OAuth buttons
3. Sign in via Google OAuth
4. **Expected:** 4-tab navigation appears (Exercises, Workouts, Templates, Settings)
5. Go to Settings tab → tap "Sign Out"
6. **Expected:** Returns to LoginScreen

### 2. Exercise browse with filters

1. Navigate to Exercises tab
2. **Expected:** Scrollable list of exercises with color-coded badges
3. Tap "Chest" muscle group chip
4. **Expected:** List narrows to chest exercises only (~16)
5. Tap "Barbell" equipment chip
6. **Expected:** List narrows further to barbell chest exercises
7. Type "press" in search bar
8. **Expected:** List shows only exercises with "press" in name
9. Clear search and tap "All" on both filter rows
10. **Expected:** Full exercise list returns

### 3. Workout lifecycle (start → log → finish → history)

1. Navigate to Workouts tab → tap "Start Workout"
2. **Expected:** ActiveWorkoutScreen appears with running duration timer
3. Tap "Add Exercise" → select "Bench Press" from picker
4. **Expected:** Bench Press appears in workout with "Add Set" button
5. Tap "Add Set" → enter weight: 60, reps: 10 → tap away (blur)
6. **Expected:** Set saved, values persist
7. Add 2 more sets with different weights
8. **Expected:** 3 sets visible under Bench Press
9. Tap "Finish Workout" → confirm in alert
10. **Expected:** Navigates back to Workouts tab, workout appears in history with date, duration, exercise count

### 4. Full set tracking (RPE, tempo, notes)

1. Start a new workout → add any exercise → add a set
2. Enter RPE: 8 → blur
3. **Expected:** RPE 8 saved
4. Expand tempo/notes row → enter tempo: "3-1-2-0" → blur
5. **Expected:** Tempo saved
6. Enter note text → blur
7. **Expected:** Note saved

### 5. Previous performance display

1. Start a new workout → add the same exercise used in Test Case 3
2. **Expected:** "Last: 3×10 @ 60 kg" (or similar) appears inline below exercise name
3. Add a new exercise never done before
4. **Expected:** "First time! 🎉" badge appears

### 6. Superset grouping

1. In an active workout, add 3 exercises
2. Tap "Group Superset" → check 2 exercises → tap "Create Superset"
3. **Expected:** Selected exercises appear in a colored-border container with "Superset" badge
4. Tap "Remove from superset" on one exercise
5. **Expected:** Exercise moves out of superset container

### 7. Rest timer

1. In an active workout, log a set
2. **Expected:** Rest timer appears at bottom with circular countdown (~60s default or configured value)
3. Wait a few seconds → tap "Pause"
4. **Expected:** Timer pauses, shows "Resume" button
5. Tap "Resume" → timer resumes
6. Tap "+15s" → time increases by 15 seconds
7. Tap "Skip"
8. **Expected:** Timer disappears
9. Let a timer run to completion
10. **Expected:** Phone vibrates, timer shows "Done!" with checkmark

### 8. Per-exercise rest time config

1. In an active workout, tap the clock icon on an exercise
2. **Expected:** Rest duration config expands with ±15s buttons
3. Adjust to 90s → log a set
4. **Expected:** Timer starts with 90s instead of default

### 9. Templates

1. Navigate to Templates tab
2. **Expected:** Empty state with guidance text (or existing templates if any)
3. Navigate to Workouts tab → find a completed workout → tap "Save as Template"
4. **Expected:** Text input modal appears for template name
5. Enter "Push Day" → tap Save
6. **Expected:** Success alert
7. Navigate to Templates tab
8. **Expected:** "Push Day" template card visible with exercise names
9. Tap "Start Workout" on the template
10. **Expected:** ActiveWorkoutScreen opens with pre-filled exercises (but no sets)
11. Finish or cancel, then delete the template
12. **Expected:** Template removed from list

### 10. Unit preference

1. Navigate to Settings tab → toggle unit to "lbs"
2. **Expected:** Unit changes to lbs
3. Navigate to active workout → check weight displays
4. **Expected:** Weights shown in lbs
5. Toggle back to "kg"
6. **Expected:** Weights shown in kg

### 11. Cross-platform realtime sync

1. Open web app (localhost:3000) and mobile app, both signed in as the same user
2. On mobile, start a workout and log a set
3. **Expected:** On web, the workout and set appear within ~1 second
4. On web, log another set
5. **Expected:** On mobile, the new set appears within ~1 second

### 12. App identity and styling

1. Check app name in device app switcher or home screen
2. **Expected:** Shows "WorkoutTracker" (not "NotesContract")
3. Check status bar
4. **Expected:** Light/white background with dark content
5. Visual scan all screens
6. **Expected:** Clean/minimal design — white backgrounds, system blue accents, consistent spacing, no blue "NotesContract" branding

## Edge Cases

### Delete workout with sets

1. Complete a workout with multiple exercises and sets
2. In history, tap delete on the workout → confirm
3. **Expected:** Workout removed from list, all associated data cleaned up

### Start workout while one is active

1. Start a workout → navigate back to Workouts tab
2. Tap "Start Workout" again
3. **Expected:** Returns to the existing active workout (auto-resume, D018)

### Start from template while workout is active

1. Have an active workout in progress
2. Navigate to Templates → tap "Start Workout" on a template
3. **Expected:** Alert says an active workout already exists (D035)

### RPE validation

1. In a set row, enter RPE: 15 → blur
2. **Expected:** Error (RPE must be 1-10) — rejected by server

### Empty filters

1. Select a muscle group + equipment combination with no exercises
2. **Expected:** "No exercises match your filters" empty state

## Failure Signals

- App crashes or shows React error boundary on any screen
- Exercise list shows 0 items when no filters are active (should be 144)
- Workout creation results in duplicate workouts (useRef guard failure)
- Timer doesn't start after logging a set
- No vibration on timer completion (device vibration may be disabled — check settings)
- Template save fails silently (should show error alert)
- Unit toggle doesn't persist after navigating away and back
- Cross-platform: data created on one platform doesn't appear on the other within 5 seconds
- Any "NotesContract", "NotesDashboard", or blue-branded UI remnants visible

## Requirements Proved By This UAT

- R001 — Exercise browse with 144 exercises, muscle group/equipment filters, text search on mobile
- R002 — Full workout CRUD with realtime sync on mobile
- R003 — Set tracking with weight/reps/RPE/tempo/notes on mobile
- R004 — Rest timer auto-start, countdown, pause/skip/adjust, vibration on mobile
- R005 — Superset visual grouping with create/remove controls on mobile
- R006 — Template save/load/delete on mobile
- R007 — Previous performance display inline on mobile
- R008 — Unit preference toggle (kg/lbs) on mobile
- R009 — Workout duration auto-tracking on mobile
- R010 — Body-part and equipment filtering on mobile
- R011 — All M001 features working on both web and mobile with shared backend
- R022 — Clean/minimal design language consistent across mobile screens
- R023 — Clerk authentication gating on mobile

## Not Proven By This UAT

- Timer background survival — timer behavior when app is backgrounded (acknowledged limitation, not M001 scope)
- Offline behavior — app behavior with no network connectivity (R024, deferred)
- Real device performance at scale — tested with seed data only, not months of accumulated workout history
- Accessibility compliance — screen reader support, dynamic type sizes not tested
- Push notifications — timer completion only uses vibration, no push notification

## Notes for Tester

- **Cross-platform sync requires same user account** — sign in with the same Clerk account on both web and mobile
- **Vibration may not work on iOS Simulator** — test on a real device for timer completion vibration
- **First launch may show brief loading state** — Convex queries take a moment to establish the initial subscription
- **The circular timer display uses View transforms** — it's visually approximate, not pixel-perfect SVG arcs
- **Tempo input is hidden by default** — tap the expand icon on a set row to reveal tempo and notes fields
- **Known: superset group IDs use Math.random()** — extremely unlikely but theoretically possible to get a collision; not a practical concern
