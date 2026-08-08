# Parallax

A modular AI operating system. DataHub provides intelligence context, engines provide specialized intelligence, and the Orchestrator connects everything.

See `MILESTONES.md` for what's built and what's next.

## Structure

```vbnet
apps/
  web/            application shell (placeholder until Milestone 3)
  api/            HTTP layer (placeholder until Milestone 2)
packages/
  types/          shared contracts every other package depends on
  config/         env loading
  shared/         logger, error classes, AbstractBaseEngine
  database/       connection client (stub until Milestone 2)
  datahub/        ingestion, connectors, processing, embeddings, retrieval, memory, knowledge
  engines/
    atlas/        reasoning and planning
    prism/        analysis and transformation
    sentinel/     validation and trust scoring
    echo/         response generation
  orchestrator/   engine registry and task routing
```

## Setup

```bash
cp .env.example .env
# edit .env: set DATABASE_URL to a real Postgres instance you control
npm install
npm run typecheck
npm run build
```

## Database

```bash
cd packages/database
npx drizzle-kit generate   # only needed if you change schema.ts
cd ../..
node packages/database/dist/migrate.js   # run from repo root, dotenv needs to find .env here
```

## Run the API

```bash
node apps/api/dist/index.js
```

Boots a real Postgres-backed Express server on `PORT` (default 4000), registers all four engines, and starts listening.

```bash
# register
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"at-least-8-chars"}'

# run a task through an engine (token from the response above)
curl -X POST http://localhost:4000/engines/atlas/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"goal":"Ship Milestone 2"}'
```

## Package boundaries

- Engines depend on `@parallax/types` and `@parallax/shared` only. Never on each other.
- Only the Orchestrator depends on both `@parallax/datahub` and the engine packages.
- `@parallax/database` is the only package allowed to know what database we're using.
- DataHub's retrieval and knowledge subsystems are in-memory by design until Milestone 5; see `MILESTONES.md`.
