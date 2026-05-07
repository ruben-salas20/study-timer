# frontend/Dockerfile — Multi-stage production build
#
# Stage 1 (builder): installs deps with pnpm and runs `pnpm build`.
# Stage 2 (runtime): Caddy 2 alpine image with the compiled dist files baked
#   in at /srv/frontend. The final image serves the SPA and acts as the reverse
#   proxy for PocketBase and push-service (see Caddyfile and docker-compose.prod.yml).
#
# Build args are required so Vite can inline them at build time:
#   VITE_PB_URL            — public PocketBase URL  (e.g. https://example.com)
#   VITE_PUSH_SERVICE_URL  — push dispatcher URL    (e.g. https://example.com/push)
#   VITE_VAPID_PUBLIC_KEY  — VAPID public key       (not a secret)
#
# Example build (usually done by docker-compose.prod.yml):
#   docker build \
#     --build-arg VITE_PB_URL=https://example.com \
#     --build-arg VITE_PUSH_SERVICE_URL=https://example.com/push \
#     --build-arg VITE_VAPID_PUBLIC_KEY=BExampleKey \
#     -t study-timer-web .

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Enable corepack so we can use pnpm without a global install
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy lockfile and workspace descriptor first — best-practice layer caching.
# If these files don't change, `pnpm install` layer is reused on rebuild.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

# Copy source after deps so source-only changes don't reinstall deps
COPY . .

# Vite build args — passed from docker-compose.prod.yml (via .env)
ARG VITE_PB_URL
ARG VITE_PUSH_SERVICE_URL
ARG VITE_VAPID_PUBLIC_KEY

# Expose as ENV so Vite picks them up during `pnpm build`
ENV VITE_PB_URL=$VITE_PB_URL
ENV VITE_PUSH_SERVICE_URL=$VITE_PUSH_SERVICE_URL
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY

RUN pnpm build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM caddy:2-alpine AS runtime

# Bake the compiled SPA into the image so the container is self-contained.
# Caddy serves these files from /srv/frontend (see Caddyfile).
COPY --from=builder /app/dist /srv/frontend

# Caddy listens on 80 (HTTP) and 443 (HTTPS with auto-TLS via Let's Encrypt).
EXPOSE 80 443
