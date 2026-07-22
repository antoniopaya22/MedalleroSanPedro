# ADR 0003: Modo de solo lectura sin inicio de sesión

## Estado

Aceptado. Amplía [0001-supabase-backend.md](0001-supabase-backend.md), [0002-google-sso-person-claim.md](0002-google-sso-person-claim.md) y [0005-remove-admin-role.md](0005-remove-admin-role.md).

## Contexto

El usuario quiere que cualquiera pueda consultar el registro histórico, las estadísticas y los rankings **sin necesidad de iniciar sesión** — por ejemplo para compartir el enlace o abrir la app rápidamente durante los juegos sin forzar un login de Google.

## Decisión

- Las tablas de lectura pública (`editions`, `people`, `activities`, `activity_results`, `medal_awards`) tienen una política RLS de `SELECT` abierta al rol `anon` de Supabase (no requieren sesión).
- Ninguna tabla tiene `INSERT`/`UPDATE`/`DELETE` abiertos a `anon`: toda escritura exige sesión autenticada. Salvo el propio flujo de reclamar `Person` (ADR 0002, exige solo sesión), el resto de escrituras exige además `person_id` no nulo en `profiles` — ya no existe un rol `admin` distinto (ver [0005-remove-admin-role.md](0005-remove-admin-role.md)).
- La navegación de la app no obliga a iniciar sesión para ver ediciones/rankings/histórico; el login solo se pide al intentar una acción de escritura.

## Consecuencias

- El esquema de permisos tiene dos niveles efectivos: `anon` (solo lectura) y autenticado con `Person` reclamada (lectura + escritura). Ver [domain-model.md](../domain-model.md#roles-y-permisos-ver-adr-0002-y-0005).
- Cualquier feature que añada una tabla nueva de datos "de consulta" debe replicar esta misma política de `SELECT` público por defecto, salvo que se documente explícitamente lo contrario.

## Disparador para reconsiderar

Si en el futuro se quiere ocultar el histórico a quien no sea de la familia (p. ej. si la app deja de ser de uso puramente privado/familiar), reabrir esta decisión.
