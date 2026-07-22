---
description: Añade una nueva entrada al backlog de feature_list.json
---

Dado el título/descripción que da el usuario en `$ARGUMENTS`:

1. Lee `feature_list.json`.
2. Genera un `id` kebab-case único, con el siguiente número de secuencia libre (`f-0NN-slug-descriptivo`).
3. Pregunta o infiere: `priority` (must/should/could/wont), `acceptance_criteria` (al menos 2-3 bullets concretos), `dependencies` (ids de otras features si aplica), `tags`.
4. Añade la nueva entrada al array con `status: "backlog"`, `spec_path: null`, `created_at`/`updated_at` con la fecha actual en ISO-8601.
5. Escribe el archivo de vuelta, validando que sigue siendo JSON válido.
6. No toques ninguna otra entrada existente ni `progress/` ni `specs/`.
