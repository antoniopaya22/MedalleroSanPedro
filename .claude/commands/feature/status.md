---
description: Reporte de solo lectura del backlog o de una feature concreta
---

Sin argumento: lee `progress/current.md` y `feature_list.json`, e imprime un resumen del estado de todas las features (agrupadas por `status`), sin modificar nada.

Con un id en `$ARGUMENTS`: además de lo anterior, lee `specs/<id>/tasks.md` (si existe) e imprime cuántos items están marcados vs pendientes, y el contenido de `specs/<id>/requirements.md` como recordatorio de criterios de aceptación.

Este comando nunca escribe ni edita ningún archivo.
