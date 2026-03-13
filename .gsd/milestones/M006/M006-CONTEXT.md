# M006: Stabilization, Testing & Design Refresh — Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

## Project Description

The workout tracking app has 5 milestones of feature work complete (M001–M005) with 23 tables, 164 decisions, 73 tasks shipped. However, the dev stack has never been fully validated end-to-end against a live Convex backend, 119 verification checks are pending execution, the landing page is a leftover "UseNotes" note-taking template, and all app pages need a design refresh from functional-but-plain to a polished Apple Fitness+ aesthetic.

## Why This Milestone

The app is feature-complete but not shippable. Three gaps must close:
1. **Verification gap** — 119 backend checks have never executed. R015–R021 cannot be validated without a live Convex backend.
2. **Design gap** — The landing page says "UseNotes" and talks about note-taking. Internal pages are functional but visually plain.
3. **Runtime gap** — Neither the web app nor mobile app have been fully tested at runtime. The mobile app has never been booted on a simulator.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Visit the landing page and see a polished, professional workout tracking app showcase
- Navigate all authenticated app pages with a cohesive Apple Fitness+ design (rounded cards, gradient accents, warm premium feel)
- Run all backend verification checks and see them pass
- Open the mobile app on iOS Simulator and use all 7 tabs
- Demo the full product to anyone — it looks and works like a real product

### Entry point / environment

- Entry point: `http://localhost:3000` (web), iOS Simulator (mobile)
- Environment: local dev with live Convex backend
- Live dependencies involved: Convex (realtime DB), Clerk (auth)

## Completion Class

- Contract complete means: All 119 verification checks pass, TypeScript compiles clean, all pages render without errors
- Integration complete means: Web app serves all routes with Convex data, mobile app boots and connects to Convex
- Operational complete means: Full user flows work end-to-end (auth → browse exercises → log workout → view analytics → social feed → leaderboards → challenges → group session)

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Landing page loads at localhost:3000 showing workout tracker branding, feature showcase, and CTA
- Authenticated user can navigate all app pages with consistent design language
- All 119 M003–M005 verification checks pass against live Convex
- iOS Simulator runs the Expo app with all 7 tabs rendering and basic navigation working
- TypeScript compiles 0 new errors across all 3 packages

## Risks and Unknowns

- **Convex CLI auth** — The blocking issue for all backend testing. User has a Convex project but CLI auth has failed in non-interactive terminals. Must resolve with user-provided deployment URL.
- **Seed data dependency** — Many features depend on seeded exercise data. First boot may need seed script execution.
- **Xcode/Simulator path** — `xcode-select` points to CommandLineTools, not Xcode.app. Need to switch for simulator access (requires user's sudo password or manual step).
- **Next.js 16 + Tailwind 4** — Relatively new versions; design refresh must work within their constraints. The existing `globals.css` uses Tailwind 4's `@theme` directive.
- **76 web components need design updates** — Large surface area for the design refresh. Must be systematic (design tokens first, then page-by-page).

## Existing Codebase / Prior Art

- `apps/web/src/components/home/` — Current UseNotes template landing page (384 lines across 6 files)
- `apps/web/src/components/` — 56 component files across 10 subdirectories
- `apps/web/src/app/` — 17 page routes
- `apps/web/src/app/globals.css` — Tailwind 4 config with `@theme` directive, custom breakpoints, Inter/Montserrat/Lato fonts
- `apps/web/src/components/Header.tsx` — Current nav with Headless UI Disclosure, homepage-only navigation links
- `packages/backend/scripts/verify-*.ts` — 7 verification scripts (M001: 5, M002: 3, M003: 3, M004: 3, M005: 3)
- `packages/backend/convex/testing.ts` — 94 test helper exports
- `apps/native/` — 55 React Native component/screen files

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Relevant Requirements

- R029 — Dev Stack Boots Cleanly (new)
- R030 — Landing Page Redesign (new)
- R031 — App Pages Design Refresh (new)
- R032 — Full Backend Verification (new)
- R033 — Mobile App Functional on iOS Simulator (new)
- R015–R021 — Pending validation via live backend testing
- R022 — Design language evolving from clean/minimal to Apple Fitness+ style

## Scope

### In Scope

- Convex backend connection and dev stack setup
- Landing page complete redesign (remove UseNotes, build workout tracker showcase)
- All app page design refresh (Apple Fitness+ style: rounded cards, gradients, warm colors, premium feel)
- App shell redesign (navigation, layout, header)
- Executing all 119 pending verification checks
- Fixing bugs found during verification
- iOS Simulator mobile testing
- Fixing mobile bugs found during testing

### Out of Scope / Non-Goals

- New features — no new backend functionality
- Production deployment — this is local dev stabilization
- Android testing — iOS Simulator only
- Performance optimization — functional correctness first
- Deep mobile UI redesign — only bug fixes, not a native design refresh

## Technical Constraints

- Next.js 16 with App Router — all pages are `"use client"` with Convex hooks
- Tailwind CSS 4 — uses `@theme` directive, not `tailwind.config.js`
- Clerk auth — middleware protects routes, ConvexProviderWithClerk wraps app
- Convex reactive queries — all data fetching via `useQuery`/`useMutation` hooks
- Monorepo with pnpm workspaces — `@packages/backend` workspace reference
- Mobile: Expo 54 + React Navigation + Victory Native XL

## Integration Points

- **Convex** — Backend data for all app pages, verification scripts run against live deployment
- **Clerk** — Auth flow, middleware protection, user identity
- **iOS Simulator** — Mobile app testing target (requires Xcode.app developer tools path)

## Open Questions

- **Convex deployment URL** — User says they have a project; need the actual URL to configure
- **Seed data** — May need to run seed script on first connection to populate exercise library
- **Xcode-select** — Need user to run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` or provide password for simulator access
