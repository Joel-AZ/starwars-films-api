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
pnpm start:dev                  # http://localhost:3000
```

Then open **http://localhost:3000/api/docs** for the interactive documentation.

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
- **Postman collection** in [`postman/`](postman). Import it and run it top to
  bottom with the Collection Runner: each request carries its own assertions,
  `Register` generates a fresh email so the run is repeatable, and `Login` stores
  the token for the requests that need it.

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
prisma/           schema and migrations
src/
  auth/           authentication, guards, decorators, strategies
  common/         cross-cutting helpers shared by every module
  config/         environment validation
  health/         liveness and database connectivity
  prisma/         PrismaService, registered globally
  users/          user persistence
test/             e2e suites and their harness
postman/          exported collection
```

Each feature is a self-contained module: controller for routing, service for
business logic, DTOs for the contract. Services talk to Prisma directly — there is
no repository layer, because at this size it would add indirection without
removing any duplication.
