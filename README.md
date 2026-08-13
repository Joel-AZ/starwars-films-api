# Star Wars Films API

[![CI](https://github.com/Joel-AZ/starwars-films-api/actions/workflows/ci.yml/badge.svg)](https://github.com/Joel-AZ/starwars-films-api/actions/workflows/ci.yml)

REST API for managing films, built with NestJS. It exposes JWT authentication with
role-based access control and keeps a local film catalogue in sync with the public
Star Wars API.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | NestJS 11 (TypeScript, strict) |
| Database | PostgreSQL 16 via Prisma 7 |
| Auth | Passport JWT + bcrypt |
| Docs | Swagger / OpenAPI 3, plus a Postman collection |
| Tests | Jest (unit) and supertest (e2e) |
| Package manager | pnpm |

## Quickstart

```bash
corepack enable                 # pnpm without installing anything globally
pnpm install                    # postinstall generates the Prisma client
cp .env.example .env            # edit JWT_SECRET; the defaults work as-is
docker compose up -d            # PostgreSQL on port 5433
pnpm db:migrate                 # apply migrations
pnpm db:seed                    # two accounts to log in with
pnpm start:dev                  # http://localhost:3000
```

Then open **http://localhost:3000/api/docs** for the interactive documentation.

### Accounts

| Role | Email | Password | Where it comes from |
| --- | --- | --- | --- |
| `ADMIN` | `admin@starwars.test` | `Password123!` | `pnpm db:seed` |
| `USER` | anything you like | — | `POST /api/auth/register` |

The seed creates the administrator and nothing else. Regular users are created
the way the API intends, through the public registration endpoint — but an
administrator cannot be, because registration hardcodes the `USER` role so that
nobody can self-promote by adding a field to the payload. That leaves the seed as
the only place the first administrator can come from. It is idempotent, so
running it again just resets that one account.

Log in through `/api/auth/login`, click *Authorize* in Swagger, paste the token,
and every endpoint is callable from the browser.

Port 5433 instead of the usual 5432 is deliberate: it avoids clashing with a
PostgreSQL you may already have running locally.

## Endpoints

Everything lives under the `/api` prefix.

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/health` | Public |
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/auth/me` | Authenticated |
| `GET` | `/api/films` | Public |
| `GET` | `/api/films/:id` | `USER` |
| `POST` | `/api/films` | `ADMIN` |
| `PATCH` | `/api/films/:id` | `ADMIN` |
| `DELETE` | `/api/films/:id` | `ADMIN` |
| `POST` | `/api/films/sync` | `ADMIN` |

`GET /api/films` supports `page`, `limit` (capped at 100), `search` (case-insensitive,
against the title and the director), `sortBy` and `sortOrder`, and answers with the
page plus the metadata needed to navigate it.

## Synchronizing with the Star Wars API

`POST /api/films/sync` imports the upstream catalogue. It matches films by episode
number, so running it repeatedly is safe, and it answers with what it did instead of
an empty `204`:

```json
{ "created": 6, "updated": 0, "unchanged": 0, "received": 6, "durationMs": 364 }
```

Run it a second time and the same call reports `{ "created": 0, "updated": 0,
"unchanged": 6 }`. Only the descriptive columns are ever written: the episode number
identifies the row, and films created locally through `POST /films` are never touched
by an import.

The same job also runs on a schedule, off by default:

| Variable | Default | What it does |
| --- | --- | --- |
| `SWAPI_BASE_URL` | `https://www.swapi.tech/api` | Which mirror to import from |
| `SWAPI_SYNC_ENABLED` | `false` | Whether to register the scheduled job at all |
| `SWAPI_SYNC_CRON` | `0 3 * * *` | When it runs, once registered |

It ships disabled on purpose: nobody wants a background job hitting a third-party
API from a laptop or during a test run. The endpoint is always there to force one.

### The three mirrors

The public Star Wars API is served from several hosts that disagree about where the
list of films lives:

| Host | Shape |
| --- | --- |
| `swapi.tech` | `{ result: [ { properties: { title, episode_id, … } } ] }` |
| `swapi.dev` | `{ results: [ { title, episode_id, … } ] }` |
| `swapi.info` | `[ { title, episode_id, … } ]` |

The client accepts all three and normalizes them to one internal type, so
`SWAPI_BASE_URL` can be pointed at any of them without touching code. That is not
gold-plating: `swapi.dev` was unreachable during development, and having the mapping
in one tested function meant switching mirrors was a one-line environment change.

### Roles

Accounts created through `/api/auth/register` always get the `USER` role.
Administrators are provisioned by the database seed and cannot be created through
the public API — otherwise anyone could grant themselves administrative access by
adding a field to the registration payload.

## Documentation

- **Swagger UI** at `/api/docs`. Log in, click *Authorize*, paste the token once,
  and every protected endpoint is callable from the browser.
- **Postman collection** in [`postman/`](postman). Everything is pre-filled, so
  any request works on its own — open one, press Send, in any order. When no
  token is stored yet a collection-level script logs in first, and on a fresh
  database it creates the regular user through `/auth/register` before doing so.
  `Register` generates a new email on every send, so it never collides with a
  previous run, and the whole collection is also runnable top to bottom with the
  Collection Runner.

```bash
pnpm dlx newman run postman/starwars-films-api.postman_collection.json
```

## Deploying

The repository ships a `Dockerfile` and a `railway.json`, so a Railway service
pointed at this repo builds and runs without further configuration. On start the
container applies pending migrations and seeds the administrator before booting the
server, which means a brand-new database is usable on the first request.

Two variables have to be set; everything else has a working default:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Railway exposes it as `${{ Postgres.DATABASE_URL }}` |
| `JWT_SECRET` | Any string of 16 characters or more |

`PORT` is injected by the platform and the app honours it. The health check is
already declared at `/api/health`, so a deployment that cannot reach its database is
rolled back instead of served.

The same image runs locally:

```bash
docker build -t starwars-films-api .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5433/starwars" \
  -e JWT_SECRET="a-secret-long-enough" \
  starwars-films-api
```

Seeding on every boot is a deliberate choice for a demo deployment, not a
recommendation for a real one: it keeps the documented administrator working after a
restart, at the cost of publishing known credentials. The seed upserts a single row,
so repeated boots are harmless.

## Tests

```bash
pnpm test        # unit — no database, no HTTP
pnpm test:cov    # unit with coverage
pnpm test:e2e    # e2e — boots the app against a real database
```

The e2e suite writes and truncates tables, so it runs against its own database
(`.env.test`), never the development one. Create it once and migrate it:

```bash
docker compose exec postgres createdb -U postgres starwars_test
pnpm db:test:deploy
```

A guard in `test/setup-e2e.ts` aborts the suite if `DATABASE_URL` does not point at
a database whose name ends in `_test`, so a misconfigured environment can't wipe
real data.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm start:dev` | Development server with hot reload |
| `pnpm build` / `pnpm start:prod` | Compile and run the production build |
| `pnpm lint` / `pnpm format` | ESLint (with `--fix`) and Prettier |
| `pnpm lint:check` / `pnpm typecheck` | The same checks without writing anything, as CI runs them |
| `pnpm db:migrate` | Create and apply a migration in development |
| `pnpm db:deploy` | Apply pending migrations (production) |
| `pnpm db:test:deploy` | Apply migrations to the test database |

## Project structure

```
prisma/           schema, migrations and seed
src/
  auth/           strategy, guards, decorators, DTOs
  common/         cross-cutting helpers shared by every module
  config/         environment validation and frozen config objects
  films/          film catalogue: CRUD, search, pagination
  filters/        exception filters mounted globally
  health/         liveness and database connectivity
  prisma/         PrismaService, registered globally
  swapi/          the Star Wars API integration, isolated from the domain
  users/          user persistence
test/             e2e suites and their harness
postman/          exported collection
```

Each feature is a self-contained module and stays flat inside its own folder,
with `dto/` as the only subdirectory — the same layout the Nest CLI generates.
Files are named after what they are: `*.module.ts`, `*.controller.ts`,
`*.service.ts`, `*.guard.ts`, `*.strategy.ts`, `*.decorator.ts`, `*.config.ts`.

Controllers only route and delegate; services hold the business logic and talk to
Prisma directly. There is no repository layer, because at this size it would add
indirection without removing any duplication. Unit tests live next to the file
they cover, so a module and its tests are always read together.

## Design notes

Decisions that are not obvious from the code, and the reasoning behind them.

**The film detail endpoint turns administrators away.** The brief says the detail
endpoint is for "regular users", and it is implemented literally: `GET /films/:id`
carries `@Auth(Role.USER)`, so an administrator gets a 403. It reads oddly for a
real product, and if the intent was "any authenticated user" it is one argument on
one decorator. It was left literal because the brief asks for the requested
endpoints to be respected.

**Only the film list is public.** Every other film endpoint declares who may reach
it; the list is the one the brief leaves unqualified, so it takes no token.

**Registration cannot produce an administrator.** The role is assigned in the
service and never read from the payload, and the validation pipe rejects unknown
properties outright — so `{"role": "ADMIN"}` in a registration body is a 400, not a
privilege escalation. There is a test that sends exactly that and then asserts the
database still holds no administrators.

**Tokens are resolved against the database on every request.** The JWT strategy
re-reads the user instead of trusting the payload. It costs one query per request
and buys immediate revocation: deleting an account invalidates its tokens now,
rather than whenever they happen to expire.

**Failed logins take the same time whether or not the account exists.** When the
email is unknown the password is still compared, against a fixed dummy hash. Skipping
that comparison would leak which addresses are registered through response timing.

**Only the credential endpoints are rate limited.** Register and login accept ten
requests per minute per address and answer `429` after that; everything else already
needs a token to get anywhere, so throttling it would cost more than it protects. The
limit is switched off under test, where the suite fires dozens of logins in seconds
and would end up throttling itself instead of checking behaviour.

**Database errors are translated in one place.** `PrismaExceptionFilter` maps
Prisma's codes onto HTTP — a unique-constraint violation becomes a 409, a missing
record a 404 — using the same body shape Nest produces everywhere else. Without it a
duplicate episode number would surface as an opaque 500.

**The Star Wars integration lives in its own module.** `swapi/` knows about the
upstream payload and nothing about HTTP routing; `films/` owns the domain and does
not know where an imported film came from beyond its `source` column. The endpoint
sits on the films controller because that is where the route belongs, and delegates.

**Tests never reach the real Star Wars API.** The e2e suite swaps the client for a
stub, so it is deterministic and works offline. The live integration was verified by
hand instead — twice in a row against `swapi.tech`, to confirm the second run reports
everything as unchanged.

### What is deliberately not here

No repository layer, no CQRS, no caching, no microservices. At this size each of
them would add structure without removing a problem. The same goes for refresh
tokens: the brief asks for an access token, and rotation is a meaningful amount of
surface for something nothing here needs yet.

No orchestration beyond a single container either. The `Dockerfile` runs migrations
and the seed before the server and stops there: no init containers, no entrypoint
script, no process manager. A platform that can restart a failed container already
covers what those would add here.
