# syntax=docker/dockerfile:1

FROM oven/bun:1.3-debian AS base
RUN apt-get update && apt-get install -y openssl && apt-get clean
WORKDIR /app

FROM base AS deps
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile

FROM base AS build
WORKDIR /app


ARG PUBLIC_BUILD_ENV_FILE=deployment/.env.production
COPY ${PUBLIC_BUILD_ENV_FILE} .env.production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN ./node_modules/.bin/prisma generate
RUN bun run build

FROM gcr.io/distroless/nodejs20-debian12:nonroot AS production
WORKDIR /app

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["server.js"]
