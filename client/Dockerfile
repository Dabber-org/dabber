# syntax=docker/dockerfile:1

FROM oven/bun:1.2-debian AS base

RUN apt-get update && apt-get install -y nodejs npm && apt-get clean

WORKDIR /app

FROM base AS deps
COPY bun.lock package.json ./

RUN bun install --frozen-lockfile

#todo test on windows
# Rebuild native modules (like lightningcss) with npm to ensure platform-specific binaries
RUN npm rebuild lightningcss 


FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# ARG PUBLIC_BUILD_ENV_FILE
# COPY $PUBLIC_BUILD_ENV_FILE .env

RUN bun run build

FROM gcr.io/distroless/nodejs20-debian12:nonroot AS production
WORKDIR /app

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1



COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE ${PORT}
CMD ["server.js"]

# FROM oven/bun:1.2 AS development
# WORKDIR /app
# COPY bun.lock package.json 
# ENV NEXT_TELEMETRY_DISABLED=1

# RUN --mount=type=secret,id=GITHUB_TOKEN,env=GITHUB_TOKEN \
#     bun install --frozen-lockfile 
# COPY . .

# EXPOSE 3000
# CMD ["bun", "run", "dev"]