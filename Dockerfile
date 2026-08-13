FROM node:22-alpine AS builder

RUN corepack enable
WORKDIR /app

# Dependencies first, so a source change does not reinstall them. The schema
# comes along because the postinstall hook generates the Prisma client from it.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm build


FROM node:22-alpine AS runner

RUN corepack enable
WORKDIR /app

ENV NODE_ENV=production

# Dependencies are carried over rather than reinstalled: migrations run at
# startup and the Prisma CLI that applies them is a dev dependency.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# The seed runs through ts-node at startup, so it needs the sources it imports
# and a tsconfig to compile against — not just the generated client.
COPY --from=builder /app/src ./src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts tsconfig.json ./

EXPOSE 3000

# Migrations before the server: a container that starts against an out-of-date
# schema fails on the first query instead of at boot, which is far worse. The
# seed follows so a fresh deployment has an administrator to log in with; it
# upserts one row, so restarts are harmless.
CMD ["sh", "-c", "pnpm db:deploy && pnpm db:seed && node dist/main"]
