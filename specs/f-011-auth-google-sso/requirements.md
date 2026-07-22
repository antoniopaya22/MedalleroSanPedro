# f-011-auth-google-sso — Requisitos (EARS)

Autenticación exclusiva con Google vía Supabase Auth y reclamación obligatoria de una
`Person` del histórico antes de poder escribir. Deriva de las `acceptance_criteria` de
`feature_list.json` y de los ADR [0002](../../docs/decisions/0002-google-sso-person-claim.md),
[0003](../../docs/decisions/0003-public-readonly-access.md) y
[0005](../../docs/decisions/0005-remove-admin-role.md).

Notación: `CUANDO <condición> EL SISTEMA DEBERÁ <respuesta observable>`.

## R1 — Login únicamente con Google

- **R1.1** CUANDO un usuario sin sesión abre la pantalla de inicio de sesión EL SISTEMA
  DEBERÁ ofrecer como único método de autenticación "Continuar con Google".
- **R1.2** CUANDO el usuario pulsa "Continuar con Google" EL SISTEMA DEBERÁ iniciar el
  flujo OAuth de Google vía Supabase Auth (PKCE) y, al completarse con éxito, establecer
  una sesión persistente en el dispositivo.
- **R1.3** EL SISTEMA NO DEBERÁ ofrecer email/contraseña ni ningún otro proveedor de
  identidad distinto de Google.
- **R1.4** CUANDO el usuario cancela o cierra el flujo de Google sin completarlo EL
  SISTEMA DEBERÁ volver al estado previo sin sesión y sin dejar un error bloqueante en
  pantalla.
- **R1.5** CUANDO existe una sesión persistida y el usuario reabre la app EL SISTEMA
  DEBERÁ restaurar la sesión automáticamente sin volver a pedir login.
- **R1.6** CUANDO un usuario autenticado cierra sesión EL SISTEMA DEBERÁ eliminar la
  sesión local y devolver la app al estado anónimo de solo lectura.

## R2 — Onboarding obligatorio: reclamar una Person

- **R2.1** CUANDO un usuario inicia sesión por primera vez EL SISTEMA DEBERÁ garantizar
  la existencia de un `Profile` asociado a su usuario con `personId` nulo, creado
  automáticamente (sin intervención manual).
- **R2.2** MIENTRAS un usuario autenticado tenga `Profile` con `personId` nulo EL SISTEMA
  DEBERÁ mostrar de forma obligatoria la pantalla de reclamación de `Person` y bloquear
  la navegación al resto de pantallas hasta que la complete.
- **R2.3** La pantalla de reclamación DEBERÁ listar las `Person` disponibles para
  reclamar, mostrando su nombre.
- **R2.4** CUANDO el usuario selecciona una `Person` y confirma EL SISTEMA DEBERÁ
  reclamarla de forma atómica —fijar `profiles.person_id` Y `people.claimed_by_user_id`
  en una única operación indivisible— y, al terminar con éxito, desbloquear el acceso al
  resto de la app.

## R3 — Una Person ya reclamada no es seleccionable

- **R3.1** La lista de la pantalla de reclamación DEBERÁ incluir únicamente `Person` cuyo
  `claimedByUserId` es nulo; las ya reclamadas por otro usuario no aparecen seleccionables.
- **R3.2** CUANDO dos usuarios intentan reclamar la misma `Person` de forma concurrente EL
  SISTEMA DEBERÁ concederla a lo sumo a uno; el otro DEBERÁ recibir un error claro ("esa
  persona ya ha sido reclamada") y poder reintentar con la lista actualizada.
- **R3.3** EL SISTEMA NO DEBERÁ permitir que un usuario que ya reclamó una `Person`
  reclame otra distinta (reclamación de una sola vez por usuario, ADR 0002).

## R4 — Escritura solo con Person reclamada

- **R4.1** MIENTRAS un usuario esté sin sesión (rol `anon`) EL SISTEMA NO DEBERÁ permitir
  ninguna operación de escritura sobre las tablas de dominio, salvo el propio flujo de
  reclamación (que exige sesión).
- **R4.2** MIENTRAS un usuario autenticado no haya reclamado su `Person` EL SISTEMA NO
  DEBERÁ permitir ninguna operación de escritura sobre `Person`/`Edition`/`Activity`/
  `ActivityResult`/`MedalAward`, ni desde la UI ni a nivel de política RLS.
- **R4.3** CUANDO un usuario autenticado ha reclamado su `Person` EL SISTEMA DEBERÁ
  permitirle operaciones de escritura (garantizado por la política RLS
  `has_claimed_person()`) y DEBERÁ exponer a la capa de UI una señal (`canWrite`) para
  habilitar u ocultar los controles de escritura de features posteriores.
- **R4.4** EL SISTEMA NO DEBERÁ permitir que `profiles.person_id` ni
  `people.claimed_by_user_id` se modifiquen por ninguna ruta distinta de la RPC atómica
  de reclamación (queda cerrado el hueco de la política `profiles_write_own` de f-010 y
  protegida la columna `claimed_by_user_id` frente al CRUD general de `people`).

## R5 — Reclamación atómica y segura (RPC)

- **R5.1** La reclamación DEBERÁ implementarse como una función RPC `SECURITY DEFINER`
  que: (a) exige `auth.uid()` no nulo; (b) rechaza al usuario que ya tenga `person_id`;
  (c) reclama con un `UPDATE ... WHERE claimed_by_user_id IS NULL` guardado, de modo que
  una carrera entre dos usuarios la gane solo quien vea la fila libre; (d) se apoya en las
  constraints `UNIQUE` existentes (`people.claimed_by_user_id`, `profiles.person_id`) como
  última línea de defensa; y (e) devuelve un error identificable cuando la persona ya está
  reclamada para que la UI lo distinga de otros fallos.

## Fuera de alcance (delegado)

- Navegación pública completa sin sesión (listados/rankings visibles para anónimos):
  `f-012-public-readonly-mode`. En f-011 basta con que el modo anónimo pueda existir (no se
  fuerza login para arrancar) y con un punto de entrada al login.
- Los formularios/pantallas de escritura concretos (altas de personas, ediciones,
  actividades, resultados) y su ocultación según `canWrite`: features `f-001`…`f-004`. En
  f-011 se entrega la primitiva `canWrite` y la garantía RLS, no las pantallas de escritura.
- Pantalla de "cambiar mi persona": no existe en esta versión (ADR 0002); el cambio se hace
  manualmente en Supabase.
