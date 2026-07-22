---
description: Arranca una feature del backlog: crea su spec y la pasa a in-progress
---

Feature id en `$ARGUMENTS`. Invoca al subagente `orchestrator` para:

1. Leer la entrada correspondiente en `feature_list.json` (validar que `status` es `backlog` y que sus `dependencies` están `done`; si no, avisar y parar).
2. Crear `specs/<id>/requirements.md` con los criterios de aceptación en notación EARS, ampliando los `acceptance_criteria` de `feature_list.json`.
3. Crear `specs/<id>/design.md` con decisiones técnicas: archivos/carpetas a tocar en `src/`, modelo de datos afectado (referenciar `docs/domain-model.md`), componentes/rutas, edge cases.
4. Crear `specs/<id>/tasks.md` con un checklist ordenado de pasos de implementación.
5. Actualizar `feature_list.json`: `status: "in-progress"`, `spec_path: "specs/<id>/"`, `updated_at` actualizado.
6. Actualizar `progress/current.md` con la feature activa, el spec activo y la primera tarea a abordar.
