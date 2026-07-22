# Modelo de dominio

## Origen

El modelo se ha derivado analizando `historico-medallas.xlsx` (registro histórico 2009-2025): una hoja por año con los participantes en columnas y cada fila una "prueba" de una actividad, con la medalla (`ORO`/`PLATA`/`BRONCE`) en la celda de cada participante que la ganó. Una misma actividad (p. ej. "Fútbol", "Catán") se repite muchas veces, tanto dentro de un mismo año como entre años. Cuando la prueba es por equipos, varias personas comparten la misma medalla en la misma fila (p. ej. todo el equipo ganador aparece con `ORO`). Hay además dos hojas agregadas: `CATAN` (histórico de una sola actividad across años) y `RESULTADOS` (ranking histórico total por persona) — ambas son *vistas calculadas* sobre los datos anteriores, no fuentes de verdad; se corresponden con `f-006-historic-ranking` y `f-007-activity-ranking`.

Cada celda persona×prueba del Excel tiene **tres** estados, no dos: (1) una medalla (`ORO`/`PLATA`/`BRONCE`), (2) `v` = participó en la prueba pero no ganó medalla, y (3) vacío / `x` / `X` = no participó. La distinción entre (2) y (3) es de primera clase y no derivable de las medallas: sin ella no se puede calcular un "promedio de medallas por participación" (medallas ganadas ÷ pruebas jugadas), solo por edición. El JSON ya migrado en `data/historico-medallas.json` la conserva: cada `activityResult` lleva `participants: [{ personId, medal }]` con `medal: null` para el estado (2); quien no participó no aparece en la lista.

## Entidades

- **Edition** — una edición/año del medallero. `id, year (único), label?, startDate?, endDate?, createdAt`. Históricamente 1 edición = 1 año; se modela como entidad propia (no solo un entero) por si en el futuro una edición necesita más metadatos.
- **Person** — una persona del "roster" histórico, la que puede ganar medallas. `id, name, active (bool: sigue participando o es histórica), claimedByUserId (nullable, único — el usuario de Supabase Auth que la reclamó), createdAt`. El roster es estable (siempre las mismas personas) con la posibilidad de añadir nuevas (`f-001-people-management`).
- **Profile** (extiende `auth.users` de Supabase) — `userId (= auth.uid()), email, personId (nullable FK a Person, único)`. Se crea automáticamente al primer login con Google. `personId` se rellena en el flujo de onboarding (ver ADR [0002](decisions/0002-google-sso-person-claim.md)) y a partir de ahí es inmutable salvo corrección manual directa en Supabase. No existe un campo de rol: cualquier `Profile` con `personId` no nulo puede escribir (ver ADR [0005](decisions/0005-remove-admin-role.md)).
- **Activity** — catálogo de actividades/juegos (p. ej. "Fútbol", "Catán", "Dardos"). `id, name, createdAt`. Una Activity se reutiliza en múltiples `ActivityResult` (no hay límite de repeticiones).
- **ActivityResult** — una celebración concreta de una Activity dentro de una Edition (una "prueba"). `id, editionId, activityId, participantIds: string[] (personas que participaron en esta prueba, ganaran medalla o no), playedAt (fecha, opcional), notes?, createdByUserId, createdAt`. Equivale a una fila de la hoja histórica. `participantIds` es el censo completo de la prueba: quien participó sin ganar medalla es exactamente quien está en `participantIds` pero en ningún `MedalAward` del resultado. Es información almacenada, no derivable de las medallas — es la que permite el "promedio por participación".
- **MedalAward** — la medalla de un color concreto otorgada en un `ActivityResult`, con una o varias personas (varias = empate o victoria por equipo). `id, resultId, medal: ORO | PLATA | BRONCE, personIds: string[] (mínimo 1)`. Regla: como mucho un `MedalAward` por color y por `ActivityResult` (no "dos oros" en la misma prueba; un equipo ganador es un único `MedalAward` de `ORO` con varias `personIds`). Toda persona en un `MedalAward` debe estar también en `participantIds` de su `ActivityResult` (un ganador siempre participó).

## Relaciones y reglas

- `Edition 1—N ActivityResult`, `Activity 1—N ActivityResult`.
- `ActivityResult 1—N MedalAward` (0 a 3: no todas las pruebas reparten los tres colores).
- `MedalAward N—N Person` vía `personIds`; una persona no puede tener más de un `MedalAward` en el mismo `ActivityResult` (no se puede ganar oro y bronce a la vez en la misma prueba).
- `ActivityResult N—N Person` vía `participantIds` (participación en la prueba); sin duplicados. Los `personIds` de todos los `MedalAward` de un `ActivityResult` son un subconjunto de sus `participantIds`.
- `Profile 1—1 Person` vía `personId` (una vez reclamada, una `Person` no puede volver a reclamarse — ver onboarding).
- Los rankings (por edición, histórico, por actividad) son **calculados**, nunca almacenados: se derivan agregando `MedalAward` agrupado por `Person`. La fórmula de puntuación (p. ej. oro=3/plata=2/bronce=1, o recuento de medallas por color) se decide en el `design.md` de `f-005-edition-ranking`/`f-006-historic-ranking`, no aquí. El "promedio de medallas por participación" (medallas de una persona ÷ nº de `ActivityResult` en los que figura en `participantIds`) es otra vista calculada posible a partir de `participantIds`; también se define en el `design.md` de su ranking, no aquí.

## Roles y permisos (ver ADR [0002](decisions/0002-google-sso-person-claim.md) y [0005](decisions/0005-remove-admin-role.md))

No existen roles (`admin`/`member`): solo dos niveles, según si hay sesión con `Person` reclamada o no.

- **Anónimo (sin sesión)** — lectura de `Edition`, `Person`, `Activity`, `ActivityResult`, `MedalAward` y de los rankings calculados. Sin escritura.
- **Autenticado con `Person` reclamada** — mismo acceso de lectura, más CRUD completo sobre `Person`, `Edition`, `Activity`, `ActivityResult` y `MedalAward`. Un usuario autenticado que todavía no ha reclamado su `Person` (onboarding pendiente, ADR 0002) no puede escribir hasta hacerlo.

## Convenciones de dominio

- Todo dato pasa por `src/services/` (capa única de acceso a Supabase), nunca acceso directo desde componentes.
- Copy visible al usuario en español; nombres de campos/tipos en inglés (ver [conventions.md](conventions.md)).
- El catálogo `Activity` no se borra al borrar su último `ActivityResult`: es un catálogo reutilizable, se gestiona por separado.
