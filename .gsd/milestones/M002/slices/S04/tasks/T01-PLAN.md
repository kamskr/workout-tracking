---
estimated_steps: 5
estimated_files: 4
---

# T01: Install Victory Native XL, Skia, and react-native-svg — verify build

**Slice:** S04 — Mobile Analytics — Charts, Heatmap & PRs
**Milestone:** M002

## Description

Install the three native chart/SVG dependencies (`victory-native`, `@shopify/react-native-skia`, `react-native-svg`) into the Expo 54 mobile app. Configure the required Babel plugin for Reanimated (Victory Native XL dependency). Port the `interpolateHeatmapColor` utility from web to native. Verify everything compiles cleanly. This front-loads the M002 key risk: Victory Native XL + Skia compatibility with Expo 54 / RN 0.82.1 / New Architecture. If Skia fails, fall back to `react-native-chart-kit`.

## Steps

1. **Install dependencies via Expo-compatible method.** Run `npx expo install react-native-svg @shopify/react-native-skia` to get SDK-compatible versions. Then `pnpm add victory-native` in `apps/native` (Victory Native XL doesn't need Expo version pinning). Verify `package.json` shows all 3 new dependencies.

2. **Configure Babel plugin for Reanimated.** Edit `apps/native/babel.config.js` to add `react-native-reanimated/plugin` as the last item in the `plugins` array. This is required by Victory Native XL for animations. Verify the config is valid by checking that Metro can still parse it.

3. **Port `interpolateHeatmapColor` to native.** Copy `interpolateHeatmapColor` and `HEATMAP_GRADIENT_STOPS` from `apps/web/src/lib/colors.ts` to `apps/native/src/lib/colors.ts`. The function is pure math (no DOM/React) — identical copy. This serves both the heatmap (T03) and avoids cross-package import complexity.

4. **Verify TypeScript compilation.** Run `pnpm turbo typecheck --force` and confirm 0 errors across all 3 packages. Victory Native XL, Skia, and react-native-svg type definitions must all resolve. If type errors occur, check version compatibility and install `@types/*` packages if needed.

5. **Run all backend verification scripts.** Execute all 8 verify scripts to confirm no regressions. This ensures the dependency additions didn't break any existing code or imports.

## Must-Haves

- [ ] `victory-native`, `@shopify/react-native-skia`, `react-native-svg` in `apps/native/package.json` dependencies
- [ ] `react-native-reanimated/plugin` as last entry in `babel.config.js` plugins array
- [ ] `interpolateHeatmapColor` and `HEATMAP_GRADIENT_STOPS` exported from `apps/native/src/lib/colors.ts`
- [ ] `pnpm turbo typecheck --force` passes with 0 errors
- [ ] All 72/72 backend checks pass (no regression)

## Verification

- `pnpm turbo typecheck --force` — 0 errors across backend, web, native
- `npx tsx packages/backend/scripts/verify-s01-m02.ts` + all other verify scripts — 72/72 pass
- `grep "react-native-reanimated/plugin" apps/native/babel.config.js` returns a match
- `grep "interpolateHeatmapColor" apps/native/src/lib/colors.ts` returns a match

## Observability Impact

- Signals added/changed: None — this is a dependency installation task
- How a future agent inspects this: Check `apps/native/package.json` for dependency versions; check `babel.config.js` for plugin config; run `pnpm turbo typecheck --force` to verify compilation
- Failure state exposed: TypeScript compilation errors surface version incompatibilities. Metro bundler errors surface Babel plugin issues. If Skia is incompatible, the fallback path (`react-native-chart-kit`) is documented in S04-RESEARCH.

## Inputs

- `apps/native/package.json` — current dependencies (react-native-reanimated 4.1.5, react-native-gesture-handler 2.29.1 already present)
- `apps/native/babel.config.js` — currently only `babel-preset-expo`, no plugins array
- `apps/web/src/lib/colors.ts` — source for `interpolateHeatmapColor` to port
- `apps/native/app.json` — `newArchEnabled: true` confirms New Architecture is on

## Expected Output

- `apps/native/package.json` — 3 new dependencies added (`victory-native`, `@shopify/react-native-skia`, `react-native-svg`)
- `apps/native/babel.config.js` — `plugins: ["react-native-reanimated/plugin"]` added
- `apps/native/src/lib/colors.ts` — `interpolateHeatmapColor` and `HEATMAP_GRADIENT_STOPS` exported
- Clean typecheck across all 3 monorepo packages
