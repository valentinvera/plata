# Plata

App móvil-first de **finanzas personales para Argentina**. Ingesta sin APIs bancarias
(parseo de notificaciones/capturas + categorización) y "modo al día" para no abandonar.

> El producto no es el dashboard: es **no abandonar**. La carga manual y la imposibilidad
> de "volver al día" tras unos días son las causas de abandono que Plata ataca.

## Estado

MVP en progreso. Hoy está implementado un **vertical slice local-first en la app mobile**:

- Modelo de datos y persistencia local con **SQLite** (`expo-sqlite`).
- Alta de movimientos por **texto de notificación/captura** con parser heurístico
  (monto, comercio, fecha, moneda, gasto/ingreso).
- **Categorización por reglas locales** (12 categorías pensadas para el mix argentino).
- **Confirmación 1-tap** de sugerencias y **catch-up** ("modo al día").
- Vista semanal con resumen y desglose por categoría.

Pendiente (roadmap): listener de notificaciones Android, OCR on-device, categorización con
LLM, sync cifrado opcional, presupuestos.

## Stack

- **Bun** + **Turborepo** (monorepo)
- **Expo / React Native** (mobile) con **expo-router**, **HeroUI Native** y **Uniwind**
- **TanStack Start** + **React 19** (web)
- **Hono** + **tRPC** (server)
- **Drizzle ORM** + **PostgreSQL** (sync opcional)
- **Better Auth** (autenticación)
- **Varlock** (manejo de variables de entorno tipadas)
- **Biome / Ultracite** (lint + formato)

## Estructura

```
plata/
├── apps/
│   ├── api/        # API (Hono + tRPC)
│   ├── mobile/     # App mobile (Expo / React Native) — MVP local-first
│   │   └── src/features/transactions/   # dominio, parser, categorizador, SQLite, UI
│   └── web/        # Frontend web (TanStack Start)
├── packages/
│   ├── auth/       # Configuración de Better Auth
│   ├── db/         # Schema y cliente de Drizzle
│   ├── trpc/       # Routers tRPC / lógica de negocio
│   ├── ts-config/  # Configuración compartida (tsconfig, etc.)
│   └── ui/         # Primitivos shadcn para web
├── specs/          # Arquitectura, SDLC, threat model
├── build-plan/     # Plan de producto por fases
├── brand/          # Marca, copy, pitch, wireframes
├── finance/        # Modelo financiero
├── gtm/            # Go-to-market
└── legal/          # Legal / compliance (Ley 25.326)
```

## Requisitos

- [Bun](https://bun.com) `1.4.x` (ver `packageManager` en `package.json`)
- PostgreSQL (solo para auth/sync; el MVP mobile funciona local-first sin base remota)

## Setup

```bash
bun install
```

`postinstall` genera los tipos de entorno (`src/env.ts`) con Varlock a partir de cada
`.env.schema`. Cada app define sus variables en su propio `.env` (no versionado).

### Base de datos (auth / sync)

1. Configurá `DATABASE_URL` en `apps/api/.env`.
2. Aplicá el schema. Para desarrollo rápido, Drizzle sincroniza el schema directo:

```bash
bun run db:push
```

Para entornos versionados usá las migraciones:

```bash
bun run db:migrate
```

La migración inicial es idempotente, así que también se puede aplicar sobre una base ya
creada con `db:push`.

### Desarrollo

```bash
bun run dev          # todo (turbo)
bun run dev:mobile   # solo la app mobile
bun run dev:web      # solo la web (http://localhost:3001)
bun run dev:api   # solo la API  (http://localhost:3000)
```

Para la app mobile usá Expo Go o un dev build: `bun run dev:mobile`.

## Variables de entorno

Cada app es dueña de su esquema en `.env.schema`. Varlock genera `src/env.ts` durante la
instalación; corré `bun run env:generate` tras cambiar un schema. **Versioná los
`.env.schema` y mantené los secretos en `.env` locales o en tu plataforma de deploy.**

- `apps/web/.env.schema` → `VITE_SERVER_URL`, `NODE_ENV`
- `apps/api/.env.schema` → `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`
- `apps/mobile/.env.schema` → `EXPO_PUBLIC_SERVER_URL`
- `packages/db/.env.schema` → importa `NODE_ENV` y `DATABASE_*` desde server

## Scripts

| Script | Descripción |
|---|---|
| `bun run dev` | Levanta todas las apps en modo desarrollo |
| `bun run build` | Build de todas las apps |
| `bun run check` | Lint + formato (Ultracite/Biome) |
| `bun run fix` | Aplica lint + formato |
| `bun run check-types` | Chequeo de tipos en todo el monorepo |
| `bun run test` | Tests unitarios (Bun test vía Turbo) |
| `bun run db:push` / `db:generate` / `db:migrate` / `db:migrate:deploy` / `db:studio` | Flujo de Drizzle |
| `bun run env:generate` | Regenera los tipos de entorno de las apps |
| `bun run auth:generate` | Regenera el schema de Better Auth |

## Testing

**Unitarios** — la lógica de dominio vive junto al feature y corre con el test runner de Bun:

```bash
bun run test
```

Cubren el parser de texto, el categorizador por reglas y los helpers de períodos/formato.

## CI

`.github/workflows/ci.yml` corre en cada push a `main` y en PRs, con un job:

1. **Quality**: `bun run check` (lint + formato) → `bun run check-types` → `bun run test` (unitarios).

El workflow define variables de entorno de CI porque Varlock valida los `.env.schema`
durante el build.

**Seguridad de Actions** (repo público):

- Todas las actions están **pineadas a SHA de commit** (no a tags movibles), para mitigar
  ataques de supply-chain sobre actions de terceros.
- `permissions: contents: read` (menor privilegio) y sin `pull_request_target`.
- `persist-credentials: false` en el checkout.
- **Dependabot** (`.github/dependabot.yml`) mantiene las actions actualizadas de forma segura.
- El CI no usa secretos: los PRs desde forks no tienen acceso a nada sensible.

Los tres triggers (`pull_request`, `push` a `main` y `merge_group`) lo dejan listo para usar
la **merge queue** de GitHub sin cambios adicionales.


## Estándares de código

Este repo usa **Ultracite** (Biome) con indentación de 2 espacios, sin punto y coma, comillas
dobles y organización de imports automática.

Antes de commitear:

```bash
bun run fix
```

Los hooks de pre-commit (Lefthook) formatean y lintean los archivos staged, y un hook de
`commit-msg` valida **Conventional Commits** con commitlint.

Formato de commit:

```
feat(native): add one-tap confirmation
fix(api): guard private trpc route
chore(ci): bump actions
```

## Arquitectura

- **Local-first**: los datos se procesan y guardan en el dispositivo; la nube es opcional y cifrada.
- **Ingesta sin APIs bancarias**: OCR de capturas + parseo de notificaciones/WhatsApp.
- **"Modo al día"**: reconstrucción asistida + confirmación rápida como feature central.

Ver `specs/architecture.md` (incluye los ADRs) y `specs/threat-model.md`.
