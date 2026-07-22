# CLAUDE.md

Lee primero [AGENTS.md](AGENTS.md) para contexto del proyecto. Este archivo solo añade lo específico de Claude Code.

## Subagentes (`.claude/agents/`)

- **orchestrator** — coordina el ciclo de vida de features (backlog → spec → implementación → revisión → done). Úsalo para "trabaja en el backlog", "empieza la feature X", "qué toca ahora", "continúa donde lo dejamos".
- **implementer** — implementa código y tests de una feature que ya tiene `specs/<id>/design.md` y `tasks.md`.
- **reviewer** — revisión de solo lectura de un diff contra `specs/<id>/requirements.md` y `docs/conventions.md`.
- **explorer** — búsqueda rápida de solo lectura en código/docs/specs.

## Comandos (`.claude/commands/`)

- `/feature:new` — añade una entrada a `feature_list.json`.
- `/feature:start <id>` — crea `specs/<id>/*`, pasa la feature a `in-progress`, actualiza `progress/current.md`.
- `/feature:status [id]` — reporte de solo lectura del backlog o de una feature.
- `/progress:update` — cierre de sesión: log en `progress/history.md`, refresca `progress/current.md`.

## Skills locales (`.claude/skills/`)

- **medallero-domain** — modelo de dominio de esta app (Edition/Person/Profile/Activity/ActivityResult/MedalAward) y permisos (autenticado con Person reclamada / anónimo, sin roles).
- **spec-workflow** — procedimiento del ciclo feature_list → specs → progress, notación EARS.

Las skills globales de React Native/Expo ya instaladas (`building-native-ui`, `react-native-*`, `vercel-react-native-skills`) se usan tal cual, sin duplicar contenido aquí.

## Reglas

- No edites `feature_list.json` directamente: usa `/feature:new` o `/feature:start`.
- No edites `specs/<id>/requirements.md` desde el rol implementer: esa autoría es del orchestrator.
- Todo código de aplicación va bajo `src/`; todo test bajo `src/__tests__/`.
- Ninguna acción de escritura (resultados, medallas, actividades, personas) se implementa sin comprobar que hay sesión con `Person` reclamada, tanto en la UI como en política RLS — ver [docs/decisions/0002-google-sso-person-claim.md](docs/decisions/0002-google-sso-person-claim.md) y [docs/decisions/0005-remove-admin-role.md](docs/decisions/0005-remove-admin-role.md).
