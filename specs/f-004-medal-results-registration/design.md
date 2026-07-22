# f-004-medal-results-registration - Diseno

## Resumen

Se implementa el alta de pruebas en `src/app/results/new.tsx`, visible solo con
`canWrite`. La pantalla carga ediciones, actividades y personas activas; permite
buscar/reutilizar actividad o crear una nueva; selecciona participantes y
medallas por color.

## Servicio

`src/services/activityResults.ts` expone:

- `ActivityResultValidationError`
- `createActivityResult(input)`

La operacion usa una RPC SQL nueva, `create_activity_result_with_awards`, para
insertar `activity_results` y `medal_awards` en una transaccion. El servicio
valida duplicados, participantes y que una persona no tenga mas de una medalla.

## Migracion

`supabase/migrations/20260720200000_create_activity_result_with_awards.sql`
crea la RPC. La funcion:

- exige participantes no vacios y sin duplicados;
- exige `medal_awards` con colores validos y sin color repetido;
- exige ganadores no vacios y sin duplicados;
- anade automaticamente ganadores al censo final;
- impide que una persona gane dos medallas distintas;
- inserta el resultado con `created_by_user_id = auth.uid()`.

RLS sigue siendo la garantia de permisos.

## UI

Pantalla unica `results/new`:

- guarda `canWrite`; si no, `router.replace('/')`;
- selector de edicion con filas;
- buscador de actividad, selector de coincidencias y alta rapida;
- lista de participantes activa/inactiva;
- tres secciones de medalla, solo sobre participantes seleccionados;
- al elegir una persona en una medalla, se quita de otros colores.

Entrada desde home: `Registrar resultado`, visible solo con `canWrite`.

## Tests

- Servicio: validacion local y llamada RPC.
- App: guarda `canWrite`, validacion minima, envio correcto y ocultado para anonimos.

