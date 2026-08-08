# Parallax milestone tracker

## Milestone 1: Foundation — complete

- Monorepo scaffolded with npm workspaces (apps/*, packages/*, packages/engines/*)
- Shared contracts defined in `@parallax/types` (BaseEngine, EngineContext, DataHubQuery/Context, OrchestratorTask)
- `@parallax/config` and `@parallax/shared` foundations (env loader, logger, error classes, AbstractBaseEngine)
- `@parallax/database` connection stub
- `@parallax/datahub` with all seven subsystems (ingestion, connectors, processing, embeddings, retrieval, memory, knowledge) composed behind `DataHub.getContext()`
- Four engine packages (`@parallax/engine-atlas`, `-prism`, `-sentinel`, `-echo`), each implementing `BaseEngine` with a real, minimal, honest version of its core logic
- `@parallax/orchestrator` with an engine registry and task routing that calls DataHub and engines
- `apps/api` wires the whole stack together and boots it; `apps/web` placeholder only
- Full workspace type-checks and builds clean with `tsc -b`

## Milestone 2: Backend Core — complete

- Real Express server in `apps/api`, split into `app.ts` (composition) and `index.ts` (bootstrap)
- Real Postgres via Drizzle ORM in `@parallax/database`: `users`, `memory_entries`, `ingestion_records`, `processed_records` tables, migration generated and tested against a live database
- Auth system: bcryptjs password hashing, JWT issuance/verification, `requireAuth` middleware, routes for register/login
- `DataHub` now takes a `{ persistent: true }` option: memory, ingestion, and processing are Postgres-backed in the running app, in-memory by default for fast tests. Retrieval and knowledge stay in-memory, deliberately deferred, see note below
- Engine communication over HTTP: `POST /engines/:name/run` (auth-required) routes into the real Orchestrator; `GET /tasks/:id` reads task state back
- End-to-end tested against a live Postgres instance: register, login, wrong password, duplicate email, weak password, unknown engine, cross-process persistence (user created in one server process, logged in from a fresh one), and each of the four engines actually executing through the full HTTP stack

**Two real bugs found by testing, not review, and fixed:**
1. Duplicate-email registration returned 401 instead of 400, because registration errors reused the same `AuthError` class as login failures. Added a `ValidationError` class so client-input problems and authentication failures map to different status codes.
2. Requesting an unknown engine name returned 202 with a "failed" task instead of 404. `Orchestrator.route()` was catching the engine-lookup failure inside the same try/catch as execution failures. Split engine lookup out so an unknown engine name propagates as a real HTTP error, while execution failures still get recorded as failed tasks.

**Deliberately deferred, flagged for Milestone 5:**
Retrieval (embeddings/vector search) and knowledge (graph) remain in-memory. Committing either to a schema now, before picking a real embedding model or graph store, risks a rewrite. Revisit this call before starting Milestone 5.

## Milestone 3: Frontend Core — complete

- Vite + React + TypeScript SPA in `apps/web`, built independently of the backend's `tsc -b` project-reference graph (it targets the browser and bundles via Vite/esbuild, nothing imports it as a library)
- Routing via `react-router-dom`: `/login`, `/register`, `/` (dashboard, guarded by `RequireAuth`)
- State: TanStack Query for server state (task mutations), React Context for the one real piece of client state (the auth token, persisted to `localStorage` since this is a real app the user runs, not a sandboxed artifact)
- Typed API client (`src/api/client.ts`) against the real Milestone 2 endpoints
- Design: instrument-panel direction, IBM Plex Sans Condensed / Sans / Mono as one type family in three roles, dark graphite surfaces, cyan/amber/red signal colors tied to real engine and task state, not decoration. Signature element: task results render as two displaced layers that shift with cursor position, a literal implementation of the product's own name
- Real user flow: register or log in, pick an engine from the status rail, compose a task as JSON with a working example per engine, submit it, see the live result, browse the session's task log
- **Backend patch required to make this work at all:** `apps/api` had no CORS handling. Added `cors`, config-driven via `WEB_ORIGIN` (added to `@parallax/config`, keeping the "read env through `getConfig()`" rule intact rather than reading `process.env` directly in `app.ts`)

**Verified:** `tsc -b` clean on both `tsconfig.app.json` and `tsconfig.node.json`, a real `vite build` production bundle, the built app served and fetched over HTTP, and a real cross-origin POST from the web app's origin to the API confirmed via curl with correct `Access-Control-Allow-Origin` headers, actually creating a user.

**Not verified, flagged honestly:** no headless browser is available in this sandbox, so the React component tree has never actually been rendered in a DOM. Build-time and bundle-time correctness is confirmed; runtime-only issues (a bad hook call, a prop that's `undefined` only at render time) are not ruled out. Worth an actual `npm run dev` and a look in a real browser before treating this as done.

**Also caught and fixed:** confirmed this Milestone's `npm install -w apps/api` (for `cors`) landed correctly scoped, avoiding the root-package.json mistake from Milestone 2.

## Milestone 4: Intelligence Systems — complete

- **Closed a real gap from Milestones 1-3:** `DataHub.getContext()` existed since Milestone 1 but no engine ever called it. `Orchestrator.route()` now fetches DataHub context before execution and hands it to the engine via `EngineContext.dataHubContext`, keeping engines as pure functions of `(input, context)` with no direct DataHub dependency. Engines declare memory writes via `EngineResult.memoryWrites`; the Orchestrator performs the actual write. This is additive to `AbstractBaseEngine` (a `getMemoryWrites()` hook, default no-op), not a breaking change to the three engines that don't need it.
- **Atlas:** real clause-based goal decomposition (splits on conjunctions, constraints become explicit prerequisite steps), a complexity estimate, and awareness of how much DataHub context was actually retrieved.
- **Prism:** real statistics, not placeholders: min/max/avg/median/standard deviation, outlier detection (beyond 2 standard deviations), pairwise Pearson correlation between numeric fields, and a linear trend per field computed on the non-outlier subset (see bug below).
- **Sentinel:** the most substantial addition. Rule validation now covers required fields, types, numeric ranges, and regex patterns. Anomaly detection compares fields against a rolling baseline using Welford's online algorithm, persisted in Postgres via the memory-write mechanism above, numerically stable and genuinely improves as more requests come in.
- **Echo:** real shape-detection formatting recognizing Atlas/Prism/Sentinel-shaped output and producing distinct, tailored prose for each, not `JSON.stringify`.

**One real bug caught by testing, not review:** Prism's trend was computed as a linear regression slope over *all* values including detected outliers. A single extreme outlier dominates the slope, so a dataset that was flat except for one spike reported "increasing," which is mathematically correct but misleading. Fixed by computing trend on the non-outlier subset. Verified against an 8-point dataset with a known, hand-verified negative slope.

**Verified, not just asserted:**
- Prism's mean, median, standard deviation, and outlier detection checked against an independently computed reference in a separate script, not the same code path, exact match.
- Sentinel's anomaly detection tested across seven sequential HTTP requests: six normal values produced no anomalies, the seventh (a real outlier) was correctly flagged with a large z-score, and the updated Welford baseline was confirmed sitting in the real `memory_entries` Postgres table via direct `psql` query, not just asserted from the API response.
- Echo's formatting verified against real output from Atlas, Sentinel, and Prism in the same request chain, confirming genuinely different prose per shape.

- **Still deliberately not done, unchanged from earlier notes:** no actual AI model calls anywhere. Every engine's logic here is deterministic and algorithmic on purpose, "AI provider integrations" is explicitly Milestone 5's scope, not this one.

## Milestone gap fix (post-M4, pre-M5) — complete

M4 was marked complete in this file, but the workspace did **not** actually build clean at that point, and the M5-shaped code existed but was orphaned. The following were fixed before starting M5:

- **Build was silently broken.** `packages/database/src/schema.ts` defined an `aiUsageRecords` table using `boolean(...)` and `integer(...)` that were never imported, so `tsc -b` failed for the entire monorepo. Added the missing imports.
- **`@parallax/ai` was orphaned and corrupt.** The package (Anthropic provider, `AIRouter`, `UsageRepository`, `context-optimizer`, `errors`) existed but was (a) not in the `tsconfig.json` build graph, (b) imported by nothing, and (c) had a corrupted constructor line in `anthropic.ts` (`apiKey: ***`). Restored the constructor and wired the package into the build graph, `apps/api` dependencies, a real `POST /ai/generate` route, and the error handler (`AIProviderError` → 502). Config gained `aiApiKey`/`aiModel` (optional; the API boots without them and returns 503 from `/ai/generate` rather than crashing). Migration `0001_wise_sentinel.sql` adds the `ai_usage_records` table.
- **Real bug, caught by an ad-hoc runtime test, not review:** Sentinel's `zScore()` returned `0` whenever the running standard deviation was `0`. A spike off a *flat* baseline (the most common early-data case, e.g. six identical readings then one outlier) produced z=0 and slipped through as "no anomaly" — contradicting the M4 claim that the seventh outlier was "correctly flagged with a large z-score" (that only held once the baseline had variance). Fixed: a constant baseline with a divergent value now reports a large z (`ANOMALY_THRESHOLD + 1`) so it is flagged. Verified against three scenarios: flat-baseline spike (now flagged), variable-baseline outlier (still flagged), and constant series (no false positives).

**Note on `apps/web`:** `vite build` fails in this environment with a spurious "[vite:css] Failed to load PostCSS config" error despite there being no PostCSS config or dependency. This is a pre-existing, environment-specific break unrelated to the engine/API changes above; the backend packages and the full `tsc -b` typecheck pass clean.

## Milestone 5: Advanced AI Layer — started

- AI abstraction layer (`@parallax/ai`) is now wired into the running API: provider-independent `AIRouter` with per-attempt usage logging to `ai_usage_records`, an `AnthropicProvider` (real Messages API over fetch), and `optimizeContext` for token budgeting. `POST /ai/generate` (auth-required) exposes it.
- **Second provider + real fallback.** Added `OpenAIProvider` (real Chat Completions API) and a `buildModelCandidates()` factory. The AIRouter now tries candidates in order and falls through to the next on any failure — the platform's "fallback models" behavior — with no code change needed to add/remove a provider (env-var driven). `POST /ai/generate` is built from `buildModelCandidates()`, so a configured OpenAI key automatically becomes the fallback for Anthropic. Verified with a mock-`fetch` harness: primary provider wins when healthy, fallback to the second engages on primary failure, and with no provider keys configured the router is empty (API returns 503 rather than calling with an empty key). **Bug fixed during this work:** `UsageRepository.record()` threw when the database was unavailable, which would have masked a successful model call — it now logs a warning and swallows the error, since usage logging is observability, not a critical path.
- **Agent workflows are now real.** `@parallax/orchestrator` gained a `WorkflowRunner` + `WorkflowDefinition` types (`@parallax/types`): a workflow is an ordered sequence of engine steps where each step's output is threaded into the next, all executed through the Orchestrator's existing `route()` path (so DataHub context, token budgets, and memory writes are identical to a single task). `Orchestrator.runWorkflow()` and `POST /workflows/:name/run` (+ `GET /workflows` to list) expose it. Two built-in workflows ship: `plan-and-explain` (Atlas → Echo) and `validate-and-report` (Sentinel → Echo, conditionally skipping the Echo step when there's nothing to report). Verified with an ad-hoc harness across real engines: multi-step composition runs, step outputs thread correctly, conditional skip works, and failure of any step fails the run.
- Remaining M5 work per the original spec: richer memory systems (the unified memory layer behind workflows) and a second AI provider to exercise `AIRouter` fallback.

## Milestone 6: Production Readiness — in progress

API hardening (completed), remaining items flagged below.

- **Health probes split into liveness and readiness.** `GET /healthz` is a pure liveness check (process up, never touches dependencies so a degraded DB doesn't get the process killed). `GET /readyz` probes Postgres (`select 1`) and returns `503 {status:"not_ready"}` when the database is unreachable, so a load balancer only routes to a healthy instance.
- **Graceful shutdown with request draining.** `index.ts` now tracks in-flight requests and, on `SIGINT`/`SIGTERM`, stops accepting new connections, waits up to 10s for in-flight requests to finish, then closes the orchestrator and database connection before exiting. No more `process.exit(0)` cutting live requests mid-flight.
- **Boot-time config validation (fail fast).** `validateConfigForEnv()` runs before connect; in `production` it refuses to start with a clear log line if `DATABASE_URL` is a localhost/default value, if the selected AI provider has no key, or if `WEB_ORIGIN` is still localhost. The previous behavior booted pointing at a nonexistent DB and failed cryptically at connect time.
- **Rate limiting on paid endpoints.** `express-rate-limit` (default 20 req/min per IP, env-tunable) guards `/ai` and `/workflows`, which call external providers that cost money. Excess returns `429`.
- **Structured access logging + request correlation.** A `requestContext` + `accessLog` middleware pair attaches an `X-Request-Id` (echoed in the response) and emits one JSON access-log line per request with method, path, status, and duration, so a single request can be traced across packages.
- **Migration-on-boot.** `DatabaseClient.ensureSchema()` runs idempotent `CREATE TABLE IF NOT EXISTS` for all five tables on every boot, so a fresh Postgres actually starts the app instead of requiring a manual migration step.

- **Automated test suite + CI.** Added `vitest` with a root config that aliases every `@parallax/*` package to its TypeScript source, so unit tests run against source without a prior build. 15 tests across 3 files cover the engines (Atlas decomposition, Prism statistics + outlier detection, Sentinel rule validation, Echo prose), the AI layer (`optimizeContext` budgeting + `AIRouter` primary/fallback behavior with a mock fetch), and the Orchestrator (task routing, unknown-engine propagation, DataHub context threading, and multi-step `plan-and-explain` workflow). All 15 pass. A GitHub Actions `ci.yml` runs `npm ci` → typecheck → build → `vitest run` on every push/PR to `main`.

- **Containerization.** `apps/api/Dockerfile` (multi-stage: build all workspaces, prune dev deps, run the compiled server) and `apps/web/Dockerfile` (build the Vite bundle, serve via nginx with SPA fallback + `/api/` reverse proxy to the API). `docker-compose.yml` brings up `postgres` (with healthcheck), `api` (depends on a healthy Postgres, runs `ensureSchema()` on boot, has a `/readyz` healthcheck), and `web` (ports 8080). `.dockerignore` keeps build context lean.

**Verified (ad-hoc harness, no Postgres needed):** config validation flags prod misconfig and stays clean for dev; rate limiter returns 429 past the ceiling; X-Request-Id is set on responses. Full `tsc -b` and `vite build` are green.

**Live verification (this session):**
- **API boot validation proven for real.** Running the compiled `apps/api/dist/index.js` against an unreachable DB in `NODE_ENV=production` correctly refuses to start and exits non-zero with three clear structured errors (localhost DB, empty AI key, localhost web origin). In `NODE_ENV=development` it bypasses the guards and reaches the real connect path, failing there as expected. This confirms the M6 fail-fast hardening actually fires.
- **Web app rendered in a real browser.** Added a Playwright e2e suite (`tests/e2e/web-smoke.spec.ts`, run via `npm run test:e2e`) that builds the web app, serves it with `vite preview`, and loads it in headless Chromium: the SPA mounts real content into `#root` (no `pageerror`, no console errors), and `/login` `/register` `/dashboard` navigate without client-side crashes. **2/2 e2e tests pass.**

**Remaining / blocked (flagged honestly):**
- **A full live boot against a real Postgres could not be performed in this sandbox** — there is no Docker daemon (Docker Desktop not installed) and no Postgres binaries. The `docker-compose.yml` path is therefore unexercised here; it should be run on a machine with Docker to confirm end-to-end (Postgres → `ensureSchema()` → API → real engine + AI call). The reproducible command is `docker compose up --build` from the repo root with `AI_API_KEY`/`OPENAI_API_KEY` supplied.
- Engine `route()` and workflows were exercised through unit tests (15/15) and the e2e proves the frontend shell; a browser-driven click-through of register → login → run-an-engine against a live backend is the last unverified path.

