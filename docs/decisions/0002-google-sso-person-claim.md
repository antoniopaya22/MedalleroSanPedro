# ADR 0002: Login solo con Google + reclamación de persona del histórico

## Estado

Aceptado. Amplía [0001-supabase-backend.md](0001-supabase-backend.md). **La sección "Roles" de este documento está superada por [0005-remove-admin-role.md](0005-remove-admin-role.md)** (ya no existen los roles `admin`/`member`); se conserva aquí solo como registro histórico de la decisión original. El resto de este ADR (login solo con Google, onboarding de reclamar `Person`) sigue vigente.

## Contexto

El roster de participantes (`Person`) es fijo y conocido de antemano (viene del histórico: David, Carlos, Laura, Jorge, Sergio, Poli, Nuria, Sara, Dario, Pedro, Inés, Chema, Maite, Roberto, Hana, Antonio, Camila, Lucía, y ocasionalmente "Abuelos"/"Otros"/invitados, con posibilidad de añadir gente nueva). El usuario quiere que cada persona que inicia sesión se identifique con **una** de esas personas del histórico — no cuentas anónimas desligadas del roster — y que exista un rol `admin` que controle quién puede escribir datos. También quiere un modo de solo lectura sin necesidad de iniciar sesión.

## Decisión

### Autenticación

- Único proveedor: **Google SSO** vía Supabase Auth. No se implementan email/password ni otros proveedores.
- Al iniciar sesión por primera vez, Supabase crea la fila de `auth.users`; un trigger (o la propia app en el primer arranque autenticado) crea el `Profile` correspondiente con `personId = null`.

### Onboarding: reclamar una Person

- Si el `Profile` del usuario autenticado tiene `personId = null`, la app bloquea el resto de la navegación y muestra una pantalla obligatoria: "¿Quién eres?", con la lista de `Person` **cuyo `claimedByUserId` es `null`** (se ocultan/deshabilitan las ya reclamadas por otro usuario).
- Al elegir una, se hace `UPDATE people SET claimed_by_user_id = auth.uid()` + `UPDATE profiles SET person_id = <id>`, dentro de una transacción/RPC que garantice que dos usuarios no puedan reclamar la misma persona a la vez (constraint `UNIQUE` en `people.claimed_by_user_id` además de la comprobación en la query).
- Reclamar una persona es, por defecto, una operación de una sola vez por usuario: cambiarla luego requiere edición manual directa en Supabase (`people`/`profiles`), no hay pantalla de "cambiar mi persona" en la primera versión.

### Roles — superado, ver [ADR 0005](0005-remove-admin-role.md)

~~`Profile.role` es `admin` o `member`. admin: puede crear/editar `Person`, `Edition`, `Activity`, `ActivityResult`, `MedalAward`, y promover a otro `Profile` a `admin`. member: mismo acceso de lectura que un admin, sin permisos de escritura.~~ Ya no existen roles: cualquier usuario autenticado con `Person` reclamada puede escribir. Detalle y motivo en [0005-remove-admin-role.md](0005-remove-admin-role.md).

### Modo público

- Ver ADR [0003-public-readonly-access.md](0003-public-readonly-access.md).

## Consecuencias

- Tabla `profiles` (extiende `auth.users`) con `person_id` (nullable, único) — sin campo `role` (ver ADR 0005).
- Tabla `people` con `claimed_by_user_id` (nullable, único).
- Toda pantalla de escritura (altas de resultados/medallas/actividades/personas) comprueba que hay sesión y `person_id` no nulo, tanto en la UI como en política RLS — la UI oculta el control, pero la seguridad real la da RLS.

## Disparador para reconsiderar

Si en el futuro se permite que una persona sea reclamada por varios dispositivos/cuentas (p. ej. una `Person` = varias personas físicas, como "Abuelos"), o se necesita poder "liberar" una `Person` reclamada por error, revisar este ADR.
