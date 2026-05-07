# PocketBase backend — pinned version, never use "latest"
ARG PB_VERSION=0.23.4

FROM alpine:3.19

ARG PB_VERSION

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget

# Download the specific PocketBase release binary for linux/amd64
RUN wget -q \
    "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
    -O /tmp/pocketbase.zip \
    && unzip /tmp/pocketbase.zip -d /pb/ \
    && chmod +x /pb/pocketbase \
    && rm /tmp/pocketbase.zip

# pb_data is mounted as a volume at runtime — do NOT copy it into the image.
# pb_migrations and pb_hooks are copied into the image so they are read-only
# at build time; they are also bind-mounted read-only in docker-compose to
# allow live updates during development without rebuilding the image.
COPY pb_migrations/ /pb/pb_migrations/
COPY pb_hooks/      /pb/pb_hooks/

EXPOSE 8090

CMD ["/pb/pocketbase", "serve", \
     "--http=0.0.0.0:8090", \
     "--dir=/pb/pb_data", \
     "--migrationsDir=/pb/pb_migrations", \
     "--hooksDir=/pb/pb_hooks"]
