---
description: Cierre de sesión — registra el progreso en progress/history.md y refresca progress/current.md
---

1. Ejecuta `git diff --stat` para ver qué cambió en esta sesión.
2. Añade una entrada nueva y fechada (formato `## YYYY-MM-DD — <resumen corto>`) al final de `progress/history.md`, mencionando la feature activa (si hay), qué se implementó/revisó, y su nuevo estado.
3. Reescribe `progress/current.md`: feature activa (o "ninguna"), spec activo, siguiente tarea concreta a abordar, bloqueos si los hay.
4. No toques `feature_list.json` ni `specs/` — este comando solo gestiona `progress/`.
