# Study Timer — Plan de Arquitectura

> Documento vivo. Decisiones tomadas en fase de planificación, antes de escribir código.

## 1. Visión

PWA de **timer de estudio competitivo** para un grupo cerrado de amigos. Inspirada en *Lilo - Study Timer*. Permite registrar sesiones, agregar amigos por código, y competir en 4 tipos de retos. Self-hosted en VPS propio. Sin tiendas, sin monetización.

**Restricciones explícitas:**
- No bloqueo de apps (PWA no puede; aceptado).
- No publicación en App Store / Play Store.
- Distribución: link compartido → "Agregar a pantalla de inicio".
- Costo objetivo: ~$0/mes (VPS ya pagado, dominio gratuito de Hostinger).

---

## 2. Stack

| Capa | Elección | Razón |
|------|----------|-------|
| Frontend | **Vite + React 19 + TypeScript** | Bundle pequeño, HMR rápido, ecosistema PWA maduro |
| PWA | **vite-plugin-pwa** (Workbox 7.3) | Service worker auto-generado, manifest, offline |
| Estado servidor | **TanStack Query** | Cache, retry, sync con realtime de PocketBase |
| Estado cliente | **Zustand** | Liviano, sin boilerplate para timer activo + UI |
| Routing | **React Router 6** | Estándar, soporta lazy routes |
| Estilos | **Tailwind CSS v4** (config en CSS via `@theme`) | Light/dark via `data-theme`, sage accent configurable. **Sin `tailwind.config.ts`** — v4 no lo usa |
| Package manager | **pnpm** | Rápido, eficiente en disco, lockfile determinista |
| Tipos PocketBase | **pocketbase-typegen** | Genera TS desde schema PB, frontend tipado sin workspaces |
| Forms | **React Hook Form + Zod** | Tipado fuerte, validación compartida con backend |
| Iconos | **Lucide React** | Line-art consistente con el hi-fi |
| Backend | **PocketBase 0.22+** | Auth + DB + realtime + storage + admin UI en un binario |
| Reverse proxy | **Caddy 2** | HTTPS automático con Let's Encrypt, config trivial |
| Orquestación | **Docker Compose** | Reproducible, fácil migración entre VPS |
| CI/CD | **GitHub Actions** → SSH deploy | Push a `main` → build + scp + `docker compose up` |

### Por qué PocketBase y no Firebase/Supabase

| Criterio | PocketBase | Firebase | Supabase |
|----------|-----------|----------|----------|
| Self-hosted real | ✅ binario único | ❌ | Parcial (autohospedaje complejo) |
| Vendor lock-in | Cero | Alto | Medio |
| Auth + Realtime + Storage | Incluido | Incluido | Incluido |
| Costo a tu escala (decenas de users) | $0 | $0 (Spark) | $0 (Free) |
| Operación | 1 binario + SQLite | Cloud | Postgres + API + Auth |
| Escalabilidad horizontal | ❌ (nodo único) | ✅ | ✅ |

**Conclusión honesta:** la razón válida para PocketBase NO es "Firebase es de paga" (no lo es para tu escala). La razón válida es **control total + cero lock-in + simplicidad operacional**. Para tu caso (amigos, decenas de usuarios) PocketBase es ideal. Si la app explota a miles de usuarios concurrentes, migrar a Postgres es el plan B.

---

## 3. Arquitectura de alto nivel

```
                   Internet (HTTPS)
                         │
                         ▼
              ┌──────────────────────┐
              │   Caddy (reverse     │  :443 → autocert Let's Encrypt
              │   proxy + static)    │  :80  → redirect 443
              └────┬─────────┬───────┘
                   │         │
       /api/*  /_/* │         │  /*  (SPA + service worker)
                   ▼         ▼
        ┌──────────────┐  ┌─────────────────┐
        │  PocketBase  │  │  Frontend       │
        │  :8090       │  │  (archivos      │
        │              │  │   estáticos     │
        │  - SQLite    │  │   servidos por  │
        │  - Auth      │  │   Caddy)        │
        │  - Realtime  │  └─────────────────┘
        │    (WS/SSE)  │
        │  - Storage   │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │ ./pb_data/   │  volumen Docker persistente
        │  - data.db   │  backup diario via cron
        │  - storage/  │
        └──────────────┘
```

**Web Push:** PocketBase guarda subscriptions; un hook Go o un cron Node empuja notificaciones via VAPID cuando se cumplen condiciones (reto que termina, amigo te pasó en el ranking, etc.).

---

## 4. Modelo de datos (PocketBase collections)

```
users (auth collection — built-in extendida)
├── id (PK)
├── email, username, passwordHash
├── displayName: string
├── avatarUrl: string?
├── friendCode: string (único, 6 chars, autogenerado)
├── weeklyGoalMinutes: int (default 600 = 10h)
├── timezone: string (IANA, default "America/Argentina/Buenos_Aires")
├── theme: enum("auto","light","dark")
├── accentColor: enum("sage","blue","warm","mono")
└── created, updated

study_sessions
├── id (PK)
├── user: relation→users (cascade)
├── mode: enum("pomodoro","stopwatch","countdown")
├── startedAt: datetime
├── endedAt: datetime?
├── durationSec: int (calculado al cerrar; 0 si activa)
├── pomodoroConfig: json? ({work:25, break:5, cycles:4})
├── targetSec: int? (para countdown)
├── notes: string?
└── created, updated

friendships
├── id (PK)
├── userA: relation→users
├── userB: relation→users
├── status: enum("pending","accepted","blocked")
├── requestedBy: relation→users
└── created, updated
constraint: unique(min(userA,userB), max(userA,userB))

challenges
├── id (PK)
├── createdBy: relation→users
├── type: enum("race","weekly_goal","duel","group_streak")
├── title: string
├── description: string?
├── startsAt: datetime
├── endsAt: datetime
├── targetSec: int?       // race / weekly_goal
├── targetDays: int?      // group_streak
├── prizeWinner: string   // texto libre
├── prizeLoser: string?
├── status: enum("pending","active","completed","cancelled")
└── created, updated

challenge_participants
├── id (PK)
├── challenge: relation→challenges (cascade)
├── user: relation→users (cascade)
├── joinedAt: datetime
├── progressSec: int      // se actualiza desde study_sessions
├── streakDays: int       // para group_streak
└── created, updated
constraint: unique(challenge, user)

push_subscriptions
├── id (PK)
├── user: relation→users (cascade)
├── endpoint: string
├── p256dh: string
├── auth: string
├── userAgent: string
└── created
```

**Reglas de acceso (PocketBase API rules):**
- `users`: lectura pública limitada (displayName, avatar, friendCode); escritura solo del propio user.
- `study_sessions`: lectura solo dueño + amigos aceptados; escritura solo dueño.
- `friendships`: lectura solo participantes; creación con código; aceptación solo destinatario.
- `challenges`: lectura solo participantes; creación libre; edición solo creator antes de empezar.
- `challenge_participants`: lectura participantes del mismo reto; creación al unirse; updates por hook.

---

## 5. Estructura del repositorio

```
study-timer/
├── ARCHITECTURE.md              ← este documento
├── README.md
├── .env.example
├── docker-compose.yml
├── docker-compose.prod.yml
├── Caddyfile
│
├── backend/
│   ├── pocketbase                ← binario (descargado en build)
│   ├── pb_migrations/            ← migraciones SQL versionadas
│   │   ├── 001_users_extend.js
│   │   ├── 002_study_sessions.js
│   │   ├── 003_friendships.js
│   │   ├── 004_challenges.js
│   │   └── 005_push.js
│   ├── pb_hooks/                 ← lógica server-side en JS
│   │   ├── on-session-end.js     ← actualiza challenge_participants
│   │   ├── on-friend-accept.js
│   │   ├── push-dispatcher.js    ← envía web push
│   │   └── crons.js              ← rollups semanales, cierres de reto
│   └── Dockerfile
│
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── public/
│   │   ├── manifest.webmanifest
│   │   └── icons/
│   └── src/
│       ├── main.tsx
│       ├── app/                  ← composición y providers
│       │   ├── App.tsx
│       │   ├── routes.tsx
│       │   └── providers.tsx
│       ├── shared/               ← código transversal
│       │   ├── pb.ts             ← cliente PocketBase
│       │   ├── ui/               ← componentes atómicos (Button, Card…)
│       │   ├── hooks/
│       │   ├── lib/              ← utils puros
│       │   └── types/
│       ├── features/             ← screaming architecture
│       │   ├── auth/
│       │   │   ├── api/
│       │   │   ├── components/
│       │   │   ├── hooks/
│       │   │   └── pages/
│       │   ├── timer/
│       │   │   ├── api/
│       │   │   ├── components/
│       │   │   ├── hooks/        ← useTimer, usePomodoro
│       │   │   ├── pages/
│       │   │   └── store.ts      ← zustand para sesión activa
│       │   ├── friends/
│       │   ├── challenges/
│       │   ├── stats/
│       │   └── settings/
│       └── pwa/                  ← service worker, push, install prompt
│           ├── sw-register.ts
│           ├── push.ts
│           └── install-prompt.ts
│
└── .github/workflows/
    ├── ci.yml                     ← test + build
    └── deploy.yml                 ← deploy a VPS por SSH
```

**Por qué screaming architecture (`features/`):** carpetas gritan el dominio (`timer`, `challenges`) en vez de la capa técnica (`components/`, `services/`). Cuando agreguemos por ejemplo "grupos" se sabe exactamente dónde va.

---

## 6. Flujos clave

### 6.1 Auth + onboarding
1. User abre PWA → si no autenticado, ruta `/welcome`.
2. Registro con email + password → PocketBase crea `users` + autogenera `friendCode`.
3. Onboarding: meta semanal (slider) → invitar amigos (mostrar código + share API).
4. Cookie HttpOnly del JWT de PocketBase persiste sesión.

### 6.2 Sesión de timer
1. Cliente crea `study_sessions` con `startedAt` al apretar Start (modo elegido).
2. **El timer corre en el cliente** (no consultas al server cada segundo). Se persiste el `startedAt`; si recarga la página, recupera el estado del server.
3. Al pausar/terminar → PATCH con `endedAt` y `durationSec`.
4. Hook `on-session-end.js` recalcula `challenge_participants.progressSec` para retos activos del usuario.

### 6.3 Retos
- **Race**: gana el primero cuyo `progressSec >= targetSec`.
- **Weekly goal**: termina al `endsAt`; ganan todos los que llegaron a `targetSec`.
- **Duel 1v1**: igual que race con 2 participantes.
- **Group streak**: hook diario marca día válido si los N participantes registraron al menos 1 sesión; resetea si alguno falla.

### 6.4 Ranking semanal de amigos
- Vista materializada virtual: query agregada de `study_sessions` filtrada por `(user.friends, ISO week actual)`.
- Suscripción realtime al colección `study_sessions` para actualizar live.

### 6.5 Web Push
1. Cliente pide permiso → registra `push_subscriptions`.
2. `push-dispatcher.js` (hook PocketBase) escucha eventos:
   - reto está por terminar (1h antes)
   - amigo te superó en ranking
   - alguien aceptó tu invitación
3. Usa `web-push` (Node) o un microservicio Go (decisión en fase de implementación).
4. VAPID keys en `.env` del backend.

---

## 7. PWA — checklist

- [x] `manifest.webmanifest` con `display: standalone`, iconos 192/512, `theme_color`
- [x] Service worker (Workbox via vite-plugin-pwa): cache estático + runtime
- [x] Estrategia de cache:
  - `app-shell` (HTML/JS/CSS): `StaleWhileRevalidate`
  - `api/collections/*`: `NetworkFirst` con fallback a cache
  - `api/realtime`: nunca cachear
- [x] Fallback offline: pantalla "sin conexión, podés seguir tu timer local"
- [x] Install prompt custom (deferredPrompt)
- [x] Web Push (VAPID)
- [x] iOS: meta tags `apple-mobile-web-app-capable`, splash screens

---

## 8. Deploy en VPS Hostinger

### docker-compose.prod.yml (esquema)

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
      - ./frontend/dist:/srv/frontend:ro
    depends_on: [pocketbase]

  pocketbase:
    build: ./backend
    restart: unless-stopped
    volumes:
      - ./pb_data:/pb/pb_data
      - ./backend/pb_migrations:/pb/pb_migrations:ro
      - ./backend/pb_hooks:/pb/pb_hooks:ro
    environment:
      - VAPID_PUBLIC_KEY
      - VAPID_PRIVATE_KEY
      - VAPID_SUBJECT

volumes:
  caddy_data:
  caddy_config:
```

### Caddyfile

```
{$DOMAIN} {
    encode zstd gzip

    handle /api/* {
        reverse_proxy pocketbase:8090
    }
    handle /_/* {
        reverse_proxy pocketbase:8090
    }
    handle /realtime {
        reverse_proxy pocketbase:8090
    }
    handle {
        root * /srv/frontend
        try_files {path} /index.html
        file_server
    }
}
```

### Setup en VPS (resumen)

1. SSH al VPS, instalar Docker + Compose.
2. `git clone` del repo.
3. Crear `.env` con `DOMAIN=tu-subdominio.hostinger.com` y VAPID keys.
4. `docker compose -f docker-compose.prod.yml up -d`.
5. Caddy obtiene cert automáticamente.
6. Crear primer admin desde `/_/` UI de PocketBase.

### Backup

Cron diario en el host:
```
0 3 * * * tar -czf /backups/pb-$(date +\%F).tar.gz /opt/study-timer/pb_data
```

---

## 9. Roadmap de implementación (fases)

| Fase | Alcance | Done cuando… |
|------|---------|--------------|
| **F0 — Foundation** | Repo, Vite+React+TS, Tailwind, PocketBase local, Docker compose dev | `docker compose up` levanta todo y la PWA muestra "hello" |
| **F1 — Auth + onboarding** | Registro, login, friendCode, theme/accent | Flujo completo de welcome → home funciona |
| **F2 — Timer + sesiones** | 3 modos, persistencia, recuperación al recargar | Sesión sobrevive recarga; histórico se ve en stats |
| **F3 — Amigos** | Agregar por código, lista, aceptar | Dos cuentas pueden verse mutuamente y ranking semanal funciona |
| **F4 — Retos** | 4 tipos, creación, progreso live | Crear reto, unirse, ver progreso en realtime |
| **F5 — Stats + perfil + ajustes** | Pantallas Yo (3) | Stats reales con datos agregados; cambio theme/accent persiste |
| **F6 — PWA + push** | Manifest, SW, install prompt, web push con VAPID | Instalable en iOS/Android; notif llega cuando reto termina |
| **F7 — Deploy producción** | VPS Hostinger, Caddy, dominio, backups | URL pública con HTTPS, primer amigo loguea desde el celu |
| **F8 — Pulido** | Microinteracciones, estados vacío/loading/error, animaciones | UX equivalente al hi-fi |

Estimación gruesa: F0–F2 son 1 sprint; F3–F5 otro; F6–F8 medio cada uno. Total ~5–6 sprints solo.

---

## 10. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| iOS limita Web Push si no se "instala" como PWA | Notif no llega | Onboarding empuja "agregar a inicio" antes de pedir permiso |
| PocketBase nodo único cae | App offline | SW sirve shell + último cache; backup diario; restart policy en Docker |
| SQLite + concurrencia alta | Locks | A tu escala (decenas de users) no hay problema; si crece, migrar a Postgres |
| Reloj del cliente manipulado | Trampa en retos | `startedAt`/`endedAt` se setean server-side via hook |
| Token JWT expira mid-sesión | Pérdida de datos | Cliente guarda buffer local; reintenta al renovar |
| Hostinger cambia URL gratuita | App rompe | Comprar dominio propio (~$10-15/año) cuando sea momento |

---

## 11. Ajustes post-explore (confirmados)

- **React 19** en vez de 18 (ref como prop normal, sin `forwardRef`).
- **Tailwind v4**: config en CSS, no se crea `tailwind.config.ts`. Instalación via `@tailwindcss/vite`.
- **pnpm** como package manager. Sin workspaces (subdirectorios simples — `backend/` es Go, no comparte código JS).
- **`pocketbase-typegen`** como dev dep para generar tipos TS del schema PB.
- **Web Push dispatcher**: en F0 se reserva el directorio `backend/push-service/` con stub + README, pero NO se implementa hasta F6. Razón técnica: el runtime goja de pb_hooks es síncrono y sin npm — `web-push` no corre ahí. F6 implementará un microservicio Node aparte (decisión tomada en explore).
- **PocketBase**: pinned a versión específica via `ARG PB_VERSION=0.23.4` en el Dockerfile. Nunca `latest`.

## 12. Decisiones pendientes

1. **Dominio**: ¿usás el subdominio gratis de Hostinger desde el inicio o registrás uno propio? Afecta config Caddy y manifest.
2. **CI/CD**: ¿GitHub Actions con SSH deploy o algo más simple tipo `git pull && docker compose up` manual al inicio?
3. **Push dispatcher**: ¿hook JS de PocketBase (más simple) o microservicio Node aparte (más flexible)? Sugerencia: empezar con hook JS.
4. **Tests**: ¿agregamos Vitest + Testing Library desde F0 o lo posponemos? Sugerencia: desde F0, especialmente para `useTimer` que es la pieza crítica.
5. **i18n**: ¿solo español o preparamos i18next desde el inicio? Sugerencia: solo español ahora; la abstracción se puede meter después si hace falta.

---

## 13. Próximo paso

Cuando confirmes (o ajustes) este plan, el siguiente movimiento es **F0 — Foundation**:
- Inicializar el repo con Vite+React+TS+Tailwind
- Bajar binario PocketBase + crear `Dockerfile`
- Escribir `docker-compose.yml` de dev
- Verificar que `docker compose up` levanta todo y la PWA conecta a PocketBase

Si querés formalizar este plan en SDD (proposal + spec + design + tasks) antes de tocar código, decime y lanzo `/sdd-new study-timer-foundation`.
