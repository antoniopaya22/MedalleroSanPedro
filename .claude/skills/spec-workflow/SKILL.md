---
name: spec-workflow
description: Procedimiento operativo del ciclo feature_list.json → specs/<feature> → progress/ de MedalleroSanPedro, incluyendo notación EARS y cómo escribir tasks.md. Usar al ejecutar /feature:new, /feature:start, /feature:status, /progress:update, o al razonar sobre en qué archivo debe vivir cierta información del backlog.
---

# Flujo de spec de MedalleroSanPedro

## Los tres niveles

| Archivo | Responde | Autoridad |
|---|---|---|
| `feature_list.json` | **Qué** existe en el backlog, estado alto nivel | orchestrator (vía `/feature:new`, `/feature:start`) |
| `specs/<id>/` | **Cómo** se construye una feature concreta | orchestrator (crea), implementer (tasks.md) |
| `progress/current.md` | **Dónde** estamos ahora mismo, esta sesión | orchestrator, `/progress:update` |
| `progress/history.md` | **Qué pasó**, histórico append-only | `/progress:update`, hook de Stop |

No dupliques información entre niveles: `feature_list.json` tiene criterios de aceptación resumidos, `specs/<id>/requirements.md` los detalla en EARS. `progress/current.md` solo apunta (ids, paths), nunca repite contenido de specs.

## Notación EARS

Formato: `CUANDO <disparador/condición> EL SISTEMA DEBERÁ <respuesta observable>`.

Ejemplo:
```
CUANDO un usuario autenticado con su Person reclamada registra la medalla de ORO de una prueba de Fútbol para dos personas a la vez
EL SISTEMA DEBERÁ guardar un único MedalAward de tipo ORO con ambas personas asociadas a esa prueba.
```

Cada bullet de `acceptance_criteria` en `feature_list.json` se expande a 1-N reglas EARS en `specs/<id>/requirements.md`.

## tasks.md

Checklist ordenado, un paso = un cambio verificable:
```
- [ ] Definir tipo ActivityResult en src/types/activityResult.ts
- [ ] Añadir servicio createActivityResult en src/services/activityResults.ts
- [ ] Formulario de registro de medallas en src/app/edition/[id]/result/new.tsx
- [ ] Test de src/services/activityResults.ts
```
El implementer marca `- [x]` un item a la vez, nunca en bloque al final.

## Ciclo completo

`/feature:new` → entrada en `feature_list.json` (`backlog`) → `/feature:start <id>` → `specs/<id>/*` creado, `in-progress`, `progress/current.md` actualizado → implementer trabaja `tasks.md` → reviewer valida contra `requirements.md` → orchestrator marca `done`, anota `progress/history.md`.
