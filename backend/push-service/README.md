# push-service — Web Push Dispatcher (F6)

Standalone Node.js microservice that handles Web Push notification delivery for
Study Timer. PocketBase hooks call this service via HTTP whenever they need to
push a notification to a user.

## Why a separate microservice?

PocketBase hooks run inside a **goja** JavaScript runtime (Go-embedded ES5.1).
Goja has no event loop and cannot execute npm packages. The `web-push` library
requires Node.js crypto APIs unavailable in goja, so we run it as a sidecar.

## Stack

- **Runtime**: Node 20 LTS
- **Framework**: Express ^4
- **Push library**: `web-push` ^3 (handles VAPID signing + HTTP/2 delivery)
- **PocketBase client**: `pocketbase` ^0.21 (fetch subscriptions, delete stale ones)

## Generating VAPID Keys

Run once and store in `.env` (never commit `.env`):

```bash
npx web-push generate-vapid-keys
```

Output looks like:

```
Public Key:
BK3...

Private Key:
sk_...
```

Put these in your `.env`:

```
VAPID_PUBLIC_KEY=BK3...
VAPID_PRIVATE_KEY=sk_...
VAPID_SUBJECT=mailto:admin@yourdomain.com
VITE_VAPID_PUBLIC_KEY=BK3...   # same public key — frontend uses this
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VAPID_PUBLIC_KEY` | Yes | — | VAPID public key (base64-url) |
| `VAPID_PRIVATE_KEY` | Yes | — | VAPID private key (SECRET) |
| `VAPID_SUBJECT` | Yes | — | `mailto:` or `https:` contact URL |
| `POCKETBASE_URL` | No | `http://localhost:8090` | PocketBase API URL |
| `POCKETBASE_ADMIN_TOKEN` | No | — | PB admin token for subscription queries |
| `PUSH_SERVICE_TOKEN` | Yes | — | Shared secret for `/dispatch` auth |
| `PORT` | No | `3001` | HTTP port to listen on |

## API

### `GET /health`

Liveness probe. Returns `{ status: "ok" }`.

### `POST /dispatch`

Send a push notification to all subscriptions of a user.

**Headers**: `Authorization: Bearer <PUSH_SERVICE_TOKEN>`

**Body**:
```json
{
  "userId": "abc123",
  "payload": {
    "title": "Nueva solicitud de amistad",
    "body": "Juan te quiere agregar",
    "url": "/friends",
    "tag": "friend-request"
  }
}
```

**Response**:
```json
{ "sent": 2, "removed": 0 }
```

- `sent`: subscriptions successfully notified
- `removed`: stale subscriptions deleted (received 410/404 from push provider)

## Development Usage

```bash
# From repo root
cd backend/push-service
cp ../../.env.example .env   # then fill in VAPID + PUSH_SERVICE_TOKEN
npm install
npm run dev                  # starts with --watch for auto-reload
```

The dev frontend (at :5173) will generate push subscriptions that land in
PocketBase (:8090). This service must be running for hooks to dispatch pushes.

## Docker

Build and run manually:

```bash
docker build -t study-timer-push-service .
docker run -p 3001:3001 --env-file ../../.env study-timer-push-service
```

Or use `docker compose up` from the repo root — the push-service is defined
in both `docker-compose.yml` (dev) and `docker-compose.prod.yml`.

## Notes

- Web Push only works on **HTTPS** (or localhost during dev)
- The service never stores notifications — fire and forget
- Stale subscriptions (410/404 from push gateway) are auto-removed
- Push failures are logged but NEVER block the main PocketBase hook operation
