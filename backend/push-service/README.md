# push-service — Web Push microservice (F6 placeholder)

This directory is reserved for the Web Push dispatcher microservice, to be
implemented in **F6 — PWA + Push**.

## Why a separate microservice?

PocketBase hooks (`pb_hooks/`) run inside a **goja** JavaScript runtime. Goja is
a Go-embedded ES5.1 engine: it is synchronous, has no event loop, and — crucially
— cannot execute npm packages. The `web-push` npm package (which handles VAPID
key signing and HTTP/2 delivery to push endpoints) depends on Node.js crypto APIs
that are unavailable in goja.

Two implementation paths were evaluated:

| Option | Pros | Cons |
|--------|------|------|
| Pure goja hook (pb_hooks) | No extra service, simpler deploy | Cannot use `web-push`; manual VAPID signing in pure Go/goja is complex and error-prone |
| **Node microservice (chosen)** | Official `web-push` npm, straightforward VAPID, easy to test | One more container in prod compose |

**Decision**: implement as a standalone Node service in F6. PocketBase hooks will
call this service via HTTP when a push event fires (e.g. challenge ended, friend
surpassed you in ranking).

## Planned stack

- **Runtime**: Node 20 LTS
- **Framework**: Express (minimal HTTP surface — just one `POST /send` endpoint)
- **Push library**: [`web-push`](https://github.com/web-push-libs/web-push)
- **PocketBase integration**: [`pocketbase` JS SDK](https://github.com/pocketbase/js-sdk) for realtime subscription to relevant events
- **Config**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` from environment (see `.env.example`)

## Trigger events (planned)

| Event | Source | Notification |
|-------|--------|--------------|
| Challenge completed | pb_hooks/on-session-end.js | Notify all participants |
| Challenge ending soon (1 h before) | pb_hooks/crons.js | Notify active participants |
| Friend surpassed you in weekly ranking | pb_hooks/on-session-end.js | Notify the user who was passed |
| Friendship request accepted | pb_hooks/on-friend-accept.js | Notify the requester |

## F6 implementation checklist

- [ ] `package.json` with express + web-push + pocketbase
- [ ] `src/index.ts` — Express app + `POST /send` endpoint
- [ ] `src/push.ts` — VAPID signing wrapper around `web-push`
- [ ] `src/pb-listener.ts` — PocketBase realtime subscription for trigger events
- [ ] `Dockerfile` (Node 20 Alpine, non-root user)
- [ ] Add `push-service` service to `docker-compose.prod.yml`
- [ ] Wire pb_hooks to call this service via `$http.send()`
- [ ] Integration test: subscribe → trigger → receive notification in browser
