# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build

COPY tsconfig.json ./
COPY src ./src
COPY test ./test
COPY scripts ./scripts

RUN npm run build

FROM node:20-bookworm-slim AS production

ENV NODE_ENV=production \
    MCP_TRANSPORT=streamable-http \
    MCP_SERVER_HOST=0.0.0.0 \
    MCP_SERVER_PORT=8080 \
    MCP_SERVER_PATH=/ \
    MCP_CORS_ORIGINS=*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist/src ./dist/src
COPY config.json ./
COPY specs ./specs
COPY docker/healthcheck.js ./docker/healthcheck.js

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "docker/healthcheck.js"]

CMD ["node", "dist/src/server.js"]
