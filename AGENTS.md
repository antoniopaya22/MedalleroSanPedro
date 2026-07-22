# MedalleroSanPedro

Aplicación móvil (Expo / React Native) para llevar el medallero histórico de las actividades, deportes y juegos de mesa de San Pedro: el registro de resultados (oro/plata/bronce) de cada actividad, por edición (año), con el mismo grupo de personas participando año tras año (con posibilidad de añadir gente nueva). Objetivo: facilitar el registro de resultados de una actividad (nueva o repetida) y consultar la clasificación — por edición, histórica, o por actividad concreta.

## Estado actual

Solo el harness (agentes, comandos, docs, backlog) está listo — el proyecto Expo todavía no se ha arrancado. Ver `progress/current.md` para el siguiente paso concreto.

## Stack objetivo

Expo (Router, `src/app` como raíz), React Native, TypeScript estricto, alias `@/*`, Supabase (Auth con Google SSO + Postgres) como backend único. Ver [docs/tech-stack.md](docs/tech-stack.md).

## Documentación

- [docs/architecture.md](docs/architecture.md) — estructura de carpetas y capas.
- [docs/domain-model.md](docs/domain-model.md) — entidades del dominio (Edition, Person, Profile, Activity, ActivityResult, MedalAward).
- [docs/conventions.md](docs/conventions.md) — convenciones de código y test.
- [docs/tech-stack.md](docs/tech-stack.md) — stack y paquetes previstos.
- [docs/decisions/](docs/decisions/) — ADRs (decisiones técnicas, append-only).

## Flujo de trabajo (backlog → spec → progreso)

1. **`feature_list.json`** — backlog plano: qué features existen y su estado de alto nivel.
2. **`specs/<feature-id>/`** — spec detallada por feature (Kiro-style): `requirements.md` (EARS), `design.md`, `tasks.md`. Se crea al arrancar la feature.
3. **`progress/current.md`** — puntero vivo de la sesión activa (qué feature, qué tarea).
4. **`progress/history.md`** — log histórico append-only de features completadas.

No se edita `feature_list.json` a mano: usar `/feature:new` y `/feature:start`. Detalle completo en [.claude/skills/spec-workflow/SKILL.md](.claude/skills/spec-workflow/SKILL.md).

## Cómo correr el proyecto

Pendiente hasta `f-000-project-bootstrap`. Cuando exista `package.json`, se espera:

```
npm install
npm start          # expo start
npm run web        # expo start --web
npm run typecheck  # tsc --noEmit
npm test           # jest
```

Variables de entorno (Supabase) en `.env.local` — copiar `.env.example` si no existe. Ver [docs/tech-stack.md](docs/tech-stack.md).
