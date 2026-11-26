# syntax=docker/dockerfile:1.7

FROM node:24.22.3-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530 AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY test ./test
COPY scripts ./scripts

RUN npm run build

FROM node:24.22.3-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530 AS production-dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:24.22.3-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530 AS production

ENV NODE_ENV=production \
    MCP_TRANSPORT=streamable-http \
    MCP_SERVER_HOST=0.0.0.0 \
    MCP_SERVER_PORT=8080 \
    MCP_SERVER_PATH=/ \
    MCP_CORS_ORIGINS=

RUN apt-get update \
  && apt-get dist-upgrade -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
            /usr/local/lib/node_modules/npm \
            /usr/local/lib/node_modules/corepack \
            /usr/local/bin/npm \
            /usr/local/bin/npx \
            /usr/local/bin/corepack \
            /opt/yarn*

WORKDIR /app

COPY package.json ./
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY config.json ./
COPY specs ./specs
COPY docker/healthcheck.js ./docker/healthcheck.js

ARG MCP_DEFAULT_READ_ONLY=false
ARG MCP_DEFAULT_ALLOW_UNAUTHENTICATED_HTTP=false

ENV MCP_READ_ONLY=${MCP_DEFAULT_READ_ONLY} \
    MCP_ALLOW_UNAUTHENTICATED_HTTP=${MCP_DEFAULT_ALLOW_UNAUTHENTICATED_HTTP}

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "docker/healthcheck.js"]

CMD ["node", "dist/cli.js"]
