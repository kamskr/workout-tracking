# Workout Tracking Monorepo

Cross-platform workout tracking app built with Next.js, Expo, Convex, and Clerk.

## Local setup for M006/S01

### 1. Install workspace dependencies

```sh
corepack enable
pnpm install
```

### 2. Create the package-local env files

The backend env file is canonical for local runtime verification.

- `packages/backend/.env.local` ← copy from `packages/backend/.env.local.example`
- `apps/web/.env.local` ← copy from `apps/web/.env.local.example`
- `apps/native/.env` ← copy from `apps/native/.example.env`

Required alignment:

- `packages/backend/.env.local:CONVEX_URL`
- `apps/web/.env.local:NEXT_PUBLIC_CONVEX_URL`
- `apps/native/.env:EXPO_PUBLIC_CONVEX_URL`

Web and native must mirror the backend `CONVEX_URL` exactly, aside from an optional trailing slash.

### 3. Verify the env contract

```sh
pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts
pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture
```

What these checks cover:

- required env-file presence at the backend/web/native package boundaries
- required variable names per package
- backend/web/native Convex URL alignment
- web/native Clerk publishable key alignment
- redacted diagnostics only — variable names and file paths, never secret values

### 4. Verify backend seed readiness

```sh
pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts
```

The readiness script classifies failures as one of:

- `env` — canonical backend env file or `CONVEX_URL` is missing
- `connectivity` — target Convex URL cannot be reached
- `auth-or-deployment` — deployment responds but auth/deployment configuration is wrong
- `seed-data` — deployment is reachable but exercise seed rows are missing

### 5. Verify compile + web boot

```sh
pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app
pnpm --filter web-app dev
```

Expected runtime entrypoint after boot:

- `http://localhost:3000`

## Deploying web with Convex

From `apps/web`, Vercel can use:

```sh
cd ../../packages/backend && pnpm exec convex deploy --cmd 'cd ../../apps/web && pnpm build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```
