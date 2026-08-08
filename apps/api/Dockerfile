# Build stage: install all workspace deps and compile TypeScript.
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Install dependencies first (better layer caching).
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci

# Build everything (backend tsc -b + web vite bundle).
RUN npm run build

# Prune to production deps only.
RUN npm prune --omit=dev

# Runtime stage.
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps ./apps

EXPOSE 4000
# ensureSchema() runs on boot, so a fresh Postgres starts the app.
CMD ["node", "apps/api/dist/index.js"]
