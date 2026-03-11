---
id: T01
parent: S04
milestone: M002
provides:
  - victory-native, @shopify/react-native-skia, react-native-svg installed in native app
  - react-native-reanimated/plugin configured in babel.config.js
  - interpolateHeatmapColor utility ported to native
key_files:
  - apps/native/package.json
  - apps/native/babel.config.js
  - apps/native/src/lib/colors.ts
key_decisions:
  - Used npx expo install for SVG and Skia to get SDK 54-compatible pinned versions; used pnpm add for victory-native since it doesn't need Expo version pinning
patterns_established:
  - Port pure-math utilities as identical copies to apps/native/src/lib/ rather than cross-package imports
observability_surfaces:
  - TypeScript compilation errors surface version incompatibilities via pnpm turbo typecheck --force
  - Metro bundler errors would surface Babel plugin issues at dev server start
duration: 8m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Install Victory Native XL, Skia, and react-native-svg — verify build

**Installed all 3 native chart/SVG dependencies, configured Reanimated Babel plugin, ported heatmap color utility — all typecheck clean with zero regressions.**

## What Happened

1. Ran `npx expo install react-native-svg @shopify/react-native-skia` which resolved SDK 54 compatible versions: react-native-svg@15.12.1, @shopify/react-native-skia@2.2.12.
2. Ran `pnpm add victory-native` which installed victory-native@^41.20.2.
3. Added `react-native-reanimated/plugin` as the last plugin in `apps/native/babel.config.js` — required by Victory Native XL for animations.
4. Ported `interpolateHeatmapColor` and `HEATMAP_GRADIENT_STOPS` from `apps/web/src/lib/colors.ts` to `apps/native/src/lib/colors.ts` — identical pure math logic, no DOM/React dependencies.
5. Verified TypeScript compilation across all 3 monorepo packages — 0 errors.
6. Ran all 8 backend verification scripts — 72/72 checks pass.

The M002 key risk (Skia + Expo 54 / RN 0.82.1 / New Architecture compatibility) is resolved at the type level. Runtime verification requires actual Metro bundler / device execution (covered by human UAT).

## Verification

- `pnpm turbo typecheck --force` — 3/3 packages, 0 errors ✅
- `grep "react-native-reanimated/plugin" apps/native/babel.config.js` — match found ✅
- `grep "interpolateHeatmapColor" apps/native/src/lib/colors.ts` — match found ✅
- `verify-s01-m02.ts` — 12/12 ✅
- `verify-s02-m02.ts` — 8/8 ✅
- `verify-s03-m02.ts` — 11/11 ✅
- `verify-s02.ts` — 15/15 ✅
- `verify-s03.ts` — 12/12 ✅
- `verify-s04.ts` — 6/6 ✅
- `verify-s05.ts` — 8/8 ✅
- **Total: 72/72 backend checks pass**

## Diagnostics

- Check `apps/native/package.json` for dependency versions: `@shopify/react-native-skia@2.2.12`, `react-native-svg@15.12.1`, `victory-native@^41.20.2`
- Check `apps/native/babel.config.js` for `react-native-reanimated/plugin` in plugins array
- Run `pnpm turbo typecheck --force` to verify compilation
- If Skia fails at runtime (Metro build or device), the fallback path is `react-native-chart-kit` as documented in S04-RESEARCH

## Deviations

None.

## Known Issues

- Peer dependency warnings for utf-8-validate, jest version mismatch, and bs58 — all pre-existing, unrelated to this task
- Runtime Skia compatibility not yet verified (requires device/simulator — covered by human UAT)

## Files Created/Modified

- `apps/native/package.json` — added victory-native, @shopify/react-native-skia, react-native-svg
- `apps/native/babel.config.js` — added react-native-reanimated/plugin to plugins array
- `apps/native/src/lib/colors.ts` — ported interpolateHeatmapColor and HEATMAP_GRADIENT_STOPS from web
