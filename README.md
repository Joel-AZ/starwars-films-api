# Star Wars Films API

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

Film management and Star Wars synchronization are in progress.

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
  health/         liveness and database connectivity
  prisma/         PrismaService, registered globally
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
