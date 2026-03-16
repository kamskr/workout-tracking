# M006: Stabilization, Testing & Design Refresh

**Vision:** Transform the feature-complete but unpolished workout tracker into a shippable product — boot the full dev stack against a live Convex backend, execute all 119 pending verification checks to validate R015–R021, replace the leftover UseNotes landing page with a bold Apple Fitness+ inspired showcase, redesign all app pages with a premium aesthetic (rounded cards, gradient accents, warm colors), and prove the mobile app runs on iOS Simulator.

## Success Criteria

- Convex backend, Next.js web app, and Expo mobile app all boot cleanly in local dev
- Landing page at `/` shows a polished workout tracker showcase with feature highlights and CTA — no trace of UseNotes
- All authenticated app pages share a cohesive Apple Fitness+ design language with consistent navigation
- All 119 M003–M005 verification checks pass against a live Convex backend
- R015–R021 are validated with live verification evidence
- iOS Simulator runs the mobile app with all 7 tabs rendering and navigation working
- TypeScript compiles 0 new errors across all 3 packages

## Current Closure Status

- S01–S05 are closed with live evidence.
- S06 is closed as a truthful blocker/documentation slice, not as green simulator runtime proof.
- Remaining milestone blocker: this machine still points `xcode-select -p` at `/Library/Developer/CommandLineTools`, `xcrun simctl list devices` fails, and Expo iOS launch stops before simulator startup. M006 is not milestone-complete until full Xcode tooling is active and the 7-tab/core-flow native proof is rerun.

## Key Risks / Unknowns

- **Convex CLI auth in non-interactive terminal** — Every previous attempt has crashed. Must use user-provided deployment URL or find a workaround for `npx convex login`.
- **Design refresh scope** — 76 web component files across 17 pages. Risk of inconsistency or incomplete coverage if not systematically approached with shared design tokens.
- **Verification check failures** — The 119 checks have never run against real data. Unknown how many will fail and how deep the bugs go.

## Proof Strategy

- **Convex CLI auth** → retire in S01 by configuring the deployment URL directly (user provides it) and proving the dev server connects and serves data.
- **Design refresh scope** → retire in S03 by establishing design tokens and app shell first, then applying systematically in S04.
- **Verification check failures** → retire in S05 by running all checks, triaging failures, and fixing bugs.

## Verification Classes

- Contract verification: TypeScript compilation across all 3 packages. All 119 verification checks pass. All pages render without console errors.
- Integration verification: Web app fetches and displays real Convex data. Mobile app connects to Convex and renders all tabs.
- Operational verification: Full user flow (auth → exercise browse → workout → analytics → social → competitive → session) works end-to-end in browser.
- UAT / human verification: Visual design quality assessment. Mobile app feel on iOS Simulator. Landing page impression.

## Milestone Definition of Done

This milestone is complete only when all are true:

- Convex backend connected and dev server running with seed data loaded
- Next.js web app boots at localhost:3000 without errors
- Landing page is a polished workout tracker showcase (UseNotes content fully removed)
- App shell has modern navigation with consistent layout across all authenticated pages
- All 17 app pages redesigned with Apple Fitness+ aesthetic (rounded cards, gradients, warm colors)
- All 119 M003–M005 verification checks pass against live Convex
- R015–R021 moved to validated status in REQUIREMENTS.md
- Expo app boots on iOS Simulator with all 7 tabs rendering
- Core mobile flows (exercise browse, workout logging) tested and working
- TypeScript compiles 0 new errors across all 3 packages
- All bugs found during testing are fixed

## Requirement Coverage

- Covers: R029 (Dev Stack), R030 (Landing Page), R031 (App Pages Design), R032 (Backend Verification), R033 (Mobile Testing)
- Partially covers: R022 (Design Language — evolving from clean/minimal to Apple Fitness+)
- Validates: R015, R016, R017, R018, R019, R020, R021 (pending live verification execution)
- Leaves for later: R024, R025, R026 (deferred), R027, R028 (out of scope)
- Orphan risks: none

## Slices

- [x] **S01: Infrastructure & Dev Stack** `risk:high` `depends:[]`
  > After this: Convex backend connected with seed data, Next.js dev server serves pages at localhost:3000, all dependencies resolved, dev stack boots cleanly.

- [x] **S02: Landing Page Redesign** `risk:medium` `depends:[S01]`
  > After this: Bold Apple Fitness+ landing page at `/` with workout-specific hero, feature showcase sections, social proof, and CTA — UseNotes template fully replaced.

- [x] **S03: App Shell & Design System** `risk:medium` `depends:[S01]`
  > After this: Modern app shell with sidebar or top navigation, consistent layout wrapper for all authenticated pages, design tokens (colors, typography, spacing, gradients) defined in globals.css, Header component redesigned.

- [x] **S04: App Pages Design Refresh** `risk:medium` `depends:[S03]`
  > After this: All 17 internal pages (exercises, workouts, analytics, feed, templates, profile, leaderboards, challenges, sessions) redesigned with Apple Fitness+ aesthetic — rounded cards, gradient accents, warm colors, premium feel.

- [x] **S05: Backend Testing & Bug Fixes** `risk:medium` `depends:[S01]`
  > After this: All live M003–M005 backend verification runners closed green against Convex (42/42, 40/40, 41/41), R015–R021 and R032 are validated, and S06 can treat backend verification as proven input.

- [x] **S06: Mobile Testing & Bug Fixes** `risk:low` `depends:[S01,S05]`
  > After this: Native runtime truth is durable — Expo reaches Metro and the remaining stop point is explicitly the machine’s Xcode/`simctl` boundary; 7-tab/core-flow simulator proof remains blocked pending full Xcode tooling.

## Boundary Map

### S01 → S02, S03, S04, S05, S06

Produces:
- Working Convex backend connection with deployment URL configured
- Next.js dev server at localhost:3000 serving pages
- All npm dependencies resolved (clsx, etc.)
- Seed data loaded (144 exercises available)
- Clerk auth functional (login/signup flow works)
- Established env var configuration across all packages

Consumes:
- nothing (first slice)

### S02 (terminal — no downstream consumers)

Produces:
- Redesigned landing page components in `apps/web/src/components/home/`
- Updated `apps/web/src/app/page.tsx`
- Workout-specific images/assets in `apps/web/public/images/`
- Landing page Header variant (public nav vs authenticated nav)

Consumes from S01:
- Working dev server to verify page renders correctly

### S03 → S04

Produces:
- Design tokens in `globals.css` — Apple Fitness+ color palette, gradients, typography scale, spacing, border-radius conventions
- App shell layout component wrapping all authenticated routes — sidebar or top nav with consistent structure
- Redesigned Header/navigation for authenticated users (exercises, workouts, analytics, feed, profile, etc.)
- Shared UI primitives: Card, PageHeader, StatCard, Badge components with Apple Fitness+ styling
- CSS utility classes for gradient backgrounds, glass effects, card styles

Consumes from S01:
- Working dev server with Clerk auth to verify authenticated layouts

### S04 (terminal — no downstream consumers)

Produces:
- All 17 app page files redesigned
- All 56 component files updated with new design tokens
- Consistent visual language across exercises, workouts, analytics, feed, templates, profile, leaderboards, challenges, sessions

Consumes from S03:
- Design tokens, app shell, shared UI primitives, navigation

### S05 (terminal — produces validation evidence)

Produces:
- 9 verification runner results plus readiness/typecheck evidence (pass/fail with evidence)
- Bug fixes for any failing checks
- R015–R021 validation evidence for REQUIREMENTS.md updates
- Updated test helpers if needed for bug fixes

Consumes from S01:
- Live Convex backend with seed data and auth configured

### S06 (terminal)

Produces:
- Xcode developer tools path configured for simulator access
- Verified iOS Simulator boot with Expo
- Bug fixes for mobile runtime issues
- Tested 7-tab navigation and core flows

Consumes from S01:
- Working Convex backend (mobile connects to same backend)

Consumes from S05:
- Backend bug fixes (mobile consumes same APIs)
