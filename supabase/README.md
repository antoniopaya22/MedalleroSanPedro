# Supabase — esquema y configuración local

Este directorio contiene el SQL versionado del esquema de MedalleroSanPedro
(`migrations/`). El proyecto Supabase real, sus credenciales y la aplicación de
las migraciones en la nube son responsabilidad del **usuario**; aquí solo vive
el código.

## Pasos manuales (usuario)

1. **Proyecto Supabase**: ya existe (`MedalleroSanPedro`, ref
   `oqowldchsqlvddumwbap`, región `eu-west-1`, ver `docs/tech-stack.md`). Si
   hay que crear uno nuevo: [Crear proyecto](https://supabase.com/dashboard) →
   anotar URL y anon key en *Project Settings → API*.
2. **Variables de entorno**: copiar `.env.example` a `.env.local` (nunca se
   comitea) y rellenar:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. **Aplicar las migraciones** sobre el proyecto Supabase, con cualquiera de
   estas dos vías:
   - CLI de Supabase (recomendado si ya está enlazado el proyecto local):
     ```
     supabase link --project-ref oqowldchsqlvddumwbap
     supabase db push
     ```
   - O pegar el contenido de `migrations/<archivo>.sql` en el *SQL Editor* del
     dashboard de Supabase y ejecutarlo, en orden de timestamp si hay más de
     un archivo (incluida `20260719130000_auth_claim_person.sql`, de
     `f-011-auth-google-sso`).
4. **Configurar el proveedor Google (`f-011-auth-google-sso`)** — login
   exclusivo con Google, sin email/contraseña ni otros proveedores:
   - En [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
     crear un *OAuth Client ID* (tipo "Web application").
   - En *Authorized redirect URIs* añadir la URL de callback que ofrece
     Supabase (dashboard → *Authentication → Providers → Google*, campo
     "Callback URL (for OAuth)"), con forma
     `https://oqowldchsqlvddumwbap.supabase.co/auth/v1/callback`.
   - En el dashboard de Supabase (*Authentication → Providers → Google*):
     activar el proveedor y pegar el *Client ID* y *Client Secret* de Google
     Cloud. Nunca se guardan en el repo ni en el código de la app.
   - En *Authentication → URL Configuration*, añadir a *Redirect URLs* el
     deep link nativo `medallerosanpedro://redirect` (o `medallerosanpedro://`
     si el dashboard no admite comodines de path) para que
     `WebBrowser.openAuthSessionAsync` pueda cerrar el flujo al volver a la
     app.
   - Confirmar que **solo** Google está habilitado como proveedor (email/
     password y el resto deben quedar desactivados).
5. **Verificar la lectura anónima** (rol `anon`, sin sesión) tras aplicar el
   esquema — por ejemplo desde el *SQL Editor* con "Run as: anon", o con una
   petición REST sin cabecera de `Authorization` de usuario (solo la anon
   key):
   ```
   curl "https://<project-ref>.supabase.co/rest/v1/editions?select=*" \
     -H "apikey: <EXPO_PUBLIC_SUPABASE_ANON_KEY>"
   ```
   Debe devolver `200` con un array (vacío si aún no hay datos) para
   `editions`, `activities`, `activity_results` y `medal_awards` — nunca un
   error de permisos. Una petición equivalente contra `profiles` debe devolver
   un array vacío (RLS bloquea todas las filas a `anon`, no un error, ya que
   la tabla es visible pero sin filas legibles).
6. **Escritura**: confirmar que un `INSERT` de prueba contra cualquiera de las
   seis tablas falla con el rol `anon` (política RLS deniega).

## Verificación manual de `f-011-auth-google-sso` (RLS + reclamación atómica)

No hay Postgres en CI para estos dos escenarios: se verifican a mano tras
aplicar `20260719130000_auth_claim_person.sql` y configurar el proveedor
Google (paso 4). Igual que en `f-010-supabase-setup`, esto sustituye a un test
automatizado de RLS.

1. **Usuario autenticado sin `Person` reclamada no puede escribir (R4.2,
   R4.4)**:
   - Iniciar sesión con Google en la app (o generar un JWT de prueba de un
     usuario recién creado, con `profiles.person_id` todavía `null`).
   - Intentar un `INSERT`/`UPDATE` de prueba contra `editions` (o cualquier
     otra de las cinco tablas de dominio) autenticado como ese usuario: debe
     fallar por RLS (`has_claimed_person()` devuelve `false`).
   - Intentar `UPDATE public.profiles set person_id = '<algún-id>' where
     user_id = auth.uid()` directamente (sin pasar por la RPC): debe fallar,
     ya no existe ninguna política de escritura sobre `profiles` distinta de
     `profiles_select_own` (se eliminó `profiles_write_own`).
   - Intentar `UPDATE public.people set claimed_by_user_id = auth.uid() where
     id = '<alguna-persona-libre>'` directamente: debe fallar por el trigger
     `protect_person_claim` (el flag `app.claiming` solo lo activa la propia
     RPC `claim_person`).
   - Con un usuario que **ya** tiene una `Person` reclamada (`has_claimed_person()
     = true`, por lo que la política `people_write_claimed_person` de f-010 sí
     le deja pasar el `INSERT`), intentar `INSERT INTO public.people (name,
     claimed_by_user_id) VALUES ('x', '<uid-arbitrario>')` directamente (sin la
     RPC): debe fallar igualmente por el trigger `protect_person_claim`, que
     cubre `INSERT` además de `UPDATE`. Un `INSERT INTO public.people (name,
     claimed_by_user_id) VALUES ('x', null)` (alta normal de persona, f-001)
     debe funcionar sin problema para ese mismo usuario.
2. **Carrera de reclamación deja una sola persona ganadora (R3.2, R5.1)**:
   - Con dos usuarios autenticados distintos (ambos sin `Person` reclamada),
     lanzar `select public.claim_person('<mismo-person-id>')` para ambos lo
     más simultáneamente posible (dos pestañas del *SQL Editor* con "Run as"
     distinto, o dos llamadas REST/RPC en paralelo desde un script).
   - Exactamente una de las dos llamadas debe tener éxito; la otra debe
     devolver un error con código `23505` y mensaje "Esa persona ya ha sido
     reclamada" (la UI lo traduce a `PersonAlreadyClaimedError`, ver
     `src/services/people.ts`).
   - Comprobar en `people` que `claimed_by_user_id` apunta solo al usuario
     ganador, y en `profiles` que solo ese usuario tiene `person_id` fijado
     (el perdedor sigue con `person_id is null` y puede reintentar con la
     lista recargada).

## Verificación manual de `f-001-people-management` (alta y baja lógica de `people`)

`f-001` no añade ninguna migración ni política nueva: reutiliza `people_write_
claimed_person` (f-010) y el trigger `protect_person_claim` (f-011). El
escenario 1 de la sección anterior (*"Usuario autenticado sin `Person`
reclamada no puede escribir"*) ya cubre el criterio de aceptación 3 de esta
feature para la tabla `people`: un `INSERT` (alta, `src/services/people.ts#
createPerson`) o `UPDATE` (renombrar o marcar inactiva/activa, `#updatePerson`)
contra `people` con el rol `anon` o con un usuario autenticado sin `Person`
reclamada debe fallar por RLS. No hace falta repetir la verificación: basta con
confirmar, tras aplicar el esquema, que:

- Un `INSERT INTO public.people (name) VALUES ('Persona de prueba')` como
  `anon` o como autenticado sin `Person` reclamada falla por RLS.
- Un `UPDATE public.people SET active = false WHERE id = '<algún-id>'` en las
  mismas condiciones también falla por RLS.
- Ambas operaciones sí funcionan para un usuario autenticado con `Person`
  reclamada (`has_claimed_person()` devuelve `true`), y en ningún caso alteran
  `claimed_by_user_id` (el trigger `protect_person_claim` lo impediría si algún
  `UPDATE` lo intentase; los servicios de `f-001` nunca lo incluyen en el
  payload).

## Verificación manual de `f-003-activities-catalog` (alta/renombrado de `activities`)

`f-003` no añade RLS nueva: reutiliza `activities_write_claimed_person`
(f-010), ya cubierta por el escenario 1 de la sección de f-011 (*"Usuario
autenticado sin `Person` reclamada no puede escribir"*). Un `INSERT` (alta,
`src/services/activities.ts#createActivity`) o `UPDATE` (renombrado,
`#updateActivity`) contra `activities` con el rol `anon` o con un usuario
autenticado sin `Person` reclamada debe fallar por RLS; ambas operaciones sí
funcionan para un usuario con `Person` reclamada. No hace falta repetir la
verificación completa: basta con confirmar, tras aplicar el esquema, que:

- Un `INSERT INTO public.activities (name) VALUES ('Actividad de prueba')`
  como `anon` o como autenticado sin `Person` reclamada falla por RLS.
- Un `UPDATE public.activities SET name = 'Otro nombre' WHERE id =
  '<algún-id>'` en las mismas condiciones también falla por RLS.

Además, `f-003` añade la migración
`20260720190000_activities_unique_name.sql` (índice único case-insensitive
`activities_name_lower_key on public.activities (lower(name))`), aplicada tras
`20260719120000_init_schema.sql`. Es segura de aplicar sobre un catálogo
vacío. Verificar manualmente que:

- Un segundo `INSERT INTO public.activities (name) VALUES ('FÚTBOL')` cuando
  ya existe `'Fútbol'` falla con código `23505` (violación del índice único),
  independientemente de mayúsculas o espacios sobrantes ya recortados por la
  app.
- Un `UPDATE public.activities SET name = 'Fútbol' WHERE id = '<otra-fila>'`
  falla igual si `'Fútbol'` ya pertenece a otra fila.

## Importación del histórico (`f-008-historical-data-import`)

Migración puntual (one-off) de `data/historico-medallas.json` (derivado de
`historico-medallas.xlsx`, ediciones 2009-2025) a las tablas de dominio. **No**
es una pantalla de la app: es un script Node en
`src/scripts/historico/importHistorico.ts`, pensado para ejecutarse **una
sola vez**, después de aplicar todas las migraciones de este directorio y
**antes** de abrir la app a usuarios reales (para no chocar con la guarda de
idempotencia, ver más abajo).

### Por qué usa la service role key

La importación crea cientos de filas históricas sin que haya detrás un
usuario autenticado con una `Person` reclamada (`has_claimed_person()`), que
es justo lo que exigen las políticas RLS de escritura de
`20260719120000_init_schema.sql` para `editions`, `people`, `activities`,
`activity_results` y `medal_awards`. Ningún usuario real puede satisfacer esa
condición para una carga masiva de datos de 2009-2025, así que el script se
autentica con la **service role key** de Supabase, que bypassa RLS. Por eso:

- Vive exclusivamente en `src/scripts/historico/` y construye su **propio**
  cliente Node de `@supabase/supabase-js` (nunca importa
  `@/services/supabase`, que es el cliente React Native con `AsyncStorage` y
  la anon key).
- La service role key **nunca** debe usarse desde la app (`src/app/`,
  `src/components/`, `src/services/`): expondría permisos totales en el
  bundle del cliente móvil. `src/__tests__/scripts/historico/security.test.ts`
  lo verifica automáticamente (grep de `SUPABASE_SERVICE_ROLE_KEY` /
  `service_role` fuera de `src/scripts/`).

### Variables de entorno

Copiar `.env.example` a `.env.local` (nunca se comitea) y rellenar, **sin**
prefijo `EXPO_PUBLIC_` (para que Expo nunca las incluya en el bundle):

- `SUPABASE_URL` — URL del proyecto (la misma que `EXPO_PUBLIC_SUPABASE_URL`).
- `SUPABASE_SERVICE_ROLE_KEY` — *Project Settings → API → service_role
  secret* del dashboard de Supabase. Nunca comitear su valor real.

### Cómo ejecutarlo

1. Aplicar todas las migraciones de `migrations/` sobre el proyecto (paso 3
   de la sección anterior).
2. Rellenar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` y
   cargarlas en el entorno de la shell (por ejemplo con `dotenv-cli`, o
   exportándolas manualmente).
3. Ejecutar:
   ```
   npx tsx src/scripts/historico/importHistorico.ts
   ```
4. El script aborta sin escribir si `editions` o `activity_results` ya
   tienen filas (guarda de idempotencia, R8.1), para no duplicar el
   histórico en una segunda ejecución accidental. Para forzar un reinicio
   completo (borra `medal_awards`, `activity_results`, `activities`,
   `editions` y `people` en orden seguro de claves foráneas y vuelve a
   importar desde cero):
   ```
   npx tsx src/scripts/historico/importHistorico.ts --reset
   ```
5. Al terminar imprime un resumen (ediciones/personas/actividades/resultados
   creados, filas omitidas) y verifica que los totales de oro/plata/bronce
   por persona reinsertados coinciden con los del plan (R6.1), avisando si
   hay alguna discrepancia.

### Limitación de normalización de nombres de actividad

El catálogo de `Activity` se deduplica de forma determinista pero
**conservadora** (`src/scripts/historico/normalizeActivityName.ts`): sólo se
fusionan variantes que difieren en mayúsculas, tildes o espacios (p. ej.
`fronton`/`Frontón`), y un puñado de errores tipográficos inequívocos del
mismo nombre curados a mano (`Lazamiento de disco` → `Lanzamiento de disco`,
`Petnca` → `Petanca`, `Sprin` → `Sprint`, `Kingdomio` → `Kingdomino`,
`Cricket`/`Criquet` → `Criquet`). **No** se fusionan sub-variantes semánticas
aunque el nombre se parezca (`Frontón` vs `Frontón parejas` vs `Frontón
infantil`, divisiones `Jr.`/`Sr.`, etc.): de las 494 variantes crudas del
histórico, sólo se colapsan las que son inequívocamente el mismo juego. Un
curado exhaustivo de esas ~494 variantes (decidir qué sub-variantes deberían
fusionarse) es un ejercicio de datos posterior, no un bloqueante de esta
migración — ver `specs/f-008-historical-data-import/design.md` §9.

### Verificación offline (sin base de datos)

La transformación (`normalizeActivityName.ts` + `buildImportPlan.ts`) es
código puro y se testea con `npm test` contra el propio
`data/historico-medallas.json`, sin necesidad de credenciales ni conexión a
Supabase (`src/__tests__/scripts/historico/`). La ejecución real del
`INSERT` contra Supabase es un paso manual del usuario, igual que las
verificaciones de RLS de las secciones anteriores.

## Plan de mejoras (fase 1): editar/borrar resultados y nombres de persona únicos

Dos migraciones nuevas, pendientes de aplicar por el usuario igual que el
resto de este directorio:

- **`20260721100000_update_activity_result_with_awards.sql`** — RPC
  `update_activity_result_with_awards`, mismo cuerpo de validación que
  `create_activity_result_with_awards` (f-004) pero sobre una fila existente:
  sustituye `participant_ids`/`played_at`/`notes` y reemplaza por completo los
  `medal_awards` de la prueba. No añade RLS nueva: `activity_results_write_
  claimed_person` y `medal_awards_write_claimed_person` (f-010) ya son
  `for all`, así que cubren `UPDATE`/`DELETE` para cualquier autenticado con
  `Person` reclamada — el borrado de un `ActivityResult`
  (`services/activityResults.ts#deleteActivityResult`) es un `delete` simple
  sin RPC, y `medal_awards` se borra en cascada.
  - Verificar tras aplicar: un `UPDATE` vía la RPC con un usuario autenticado
    sin `Person` reclamada, o `anon`, falla por RLS; con `Person` reclamada
    funciona y dejan de existir los `medal_awards` antiguos de esa prueba
    (sustituidos por los nuevos, nunca acumulados).
- **`20260721110000_people_unique_name.sql`** — índice único case-insensitive
  `people_name_lower_key on public.people (lower(name))`, mismo patrón que
  `activities_name_lower_key` (f-003). A diferencia de `activities`, `people`
  puede ya tener filas del roster histórico importado (f-008): **comprobar
  antes de aplicar** que no exista ya un duplicado real de nombre, con
  `select lower(name), count(*) from public.people group by 1 having count(*) > 1;`
  — si devuelve alguna fila, resolver esos duplicados a mano antes de crear el
  índice, o la migración fallará.

## Notas

- No ejecutar estas migraciones falta de credenciales reales durante el
  desarrollo/CI de esta feature (`f-010-supabase-setup`): el esquema es SQL
  versionado a la espera de que el usuario lo aplique.
- El trigger de auto-creación de `Profile` al primer login, el trigger de
  protección de `claimed_by_user_id` y la RPC `claim_person` viven en
  `migrations/20260719130000_auth_claim_person.sql`
  (`f-011-auth-google-sso`); esa misma migración elimina la política
  `profiles_write_own` de `20260719120000_init_schema.sql` (cierre del hueco
  señalado por el reviewer de f-010).
