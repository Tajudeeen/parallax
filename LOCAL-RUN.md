# Local Run Guide — test the login flow without deploying

You do NOT need to deploy to the cloud to exercise email/password auth.
The whole login flow (register → login → JWT) works as soon as three things
are up: a Postgres database, the API server, and (optionally) the web dev
server. "Deploy" is only required if you want it reachable from the internet.

## What each piece does

| Process        | Port | Needed for login? | Purpose                                  |
|----------------|------|------------------|------------------------------------------|
| Postgres       | 5432 | YES              | Stores users (`users` table auto-created)|
| API (`apps/api`)| 4000 | YES              | Owns `/auth/register` and `/auth/login`  |
| Web (`apps/web`)| 5173 | No (optional)    | Browser UI; you can also test with curl  |

The `users` table is created automatically on API boot via `ensureSchema()`
(`CREATE TABLE IF NOT EXISTS "users"`), so you never run migrations by hand.

## Option A — Docker (fastest, recommended)

From the repo root:

    # 1) Start Postgres only (the API image would also build, but we run the
    #    API from source locally so we can iterate):
    docker run -d --name parallax-pg \
      -e POSTGRES_USER=parallax -e POSTGRES_PASSWORD=parallax \
      -e POSTGRES_DB=parallax -p 5432:5432 postgres:16-alpine

    # 2) Create a local .env for the API (copy the example first):
    cp .env.example apps/api/.env

    # 3) Edit apps/api/.env so these are set:
    #      NODE_ENV=development          # localhost DB is allowed in dev
    #      DATABASE_URL=postgres://parallax:parallax@localhost:5432/parallax
    #      JWT_SECRET=some-long-random-string
    #      WEB_ORIGIN=http://localhost:5173
    #      AI_PROVIDER=anthropic          # leave AI_API_KEY empty locally;
    #                                      # /ai will 503 but login never needs it

    # 4) Build everything once, then run the API:
    npm install
    npm run build
    cd apps/api && node dist/index.js
    # → logs "connected to postgres" then "server listening on :4000"

    # 5) (optional) In a second terminal, run the web UI:
    cd apps/web && npm run dev
    # → open http://localhost:5173, click Register, create an account,
    #    then Log in. The JWT is stored by AuthContext and sent on later calls.

## Option B — No Docker (you already have Postgres)

If you have Postgres locally (pg_ctl / Postgres.app / native install):

    # start it and create the database `parallax` owned by user `parallax`
    createdb -U parallax parallax        # or: psql -c "CREATE DATABASE parallax;"

    # then follow steps 2–5 above (DATABASE_URL points at your local instance).

## Test the login flow without the browser (curl)

Once the API is running on :4000:

    # Register
    curl -s -X POST http://localhost:4000/auth/register \
      -H 'Content-Type: application/json' \
      -d '{"email":"me@example.com","password":"supersecret"}'
    # → { "user": { "id": "...", "email": "me@example.com" }, "token": "eyJ..." }

    # Login (use the same credentials)
    curl -s -X POST http://localhost:4000/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"email":"me@example.com","password":"supersecret"}'
    # → same shape, fresh token

    # Use the token on a protected route
    TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"email":"me@example.com","password":"supersecret"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')

    curl -s http://localhost:4000/engines/atlas/run \
      -H "Authorization: Bearer $TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{"goal":"launch the API and deploy it"}'
    # → 202 with the routed task (Atlas needs no AI key)

## Health checks

    curl http://localhost:4000/healthz    # liveness — always 200 if process up
    curl http://localhost:4000/readyz     # readiness — 200 only if Postgres reachable

## Notes / gotchas

- Run the API in `NODE_ENV=development` for local testing. In `production`
  mode it fails fast (refuses to start) if `DATABASE_URL` is localhost,
  `AI_API_KEY` is empty, or `WEB_ORIGIN` is localhost — that's the M6
  hardening, not a bug.
- `JWT_SECRET` defaults to a hardcoded dev value if unset. It works locally,
  but ALWAYS set a real `JWT_SECRET` before any shared/pre-prod environment,
  or tokens are trivially forgeable.
- There is no email verification or password reset yet — it's plain
  register/login. Fine for an MVP.
- To run all three as containers (API + web + Postgres): `docker compose up --build`
  from the repo root (needs Docker Desktop running). That's the "deployed-like"
  path; still local unless you push the images.
