# f-008-historical-data-import — Requisitos (EARS)

Migración puntual (one-off) de `data/historico-medallas.json` (derivado de
`historico-medallas.xlsx`, ediciones 2009-2025) a las tablas de dominio de
Supabase. **"El sistema"** en este documento es el **script de importación**
(Node/TS ejecutable una sola vez), no una pantalla de la app.

Datos de origen verificados (sobre `data/historico-medallas.json`):
21 personas, 17 ediciones (2009-2025), 996 `activityResults` de los cuales 995
son pruebas reales y 1 es un artefacto (`2021-054 "MEDALLERO"`, 0 participantes),
494 nombres de actividad crudos distintos, valores de medalla `gold`/`silver`/
`bronze`/`null`, sin referencias a `personId` desconocidos y sin participantes
duplicados dentro de una prueba.

## R1 — Ediciones

- **R1.1** CUANDO el script procesa el JSON de origen EL SISTEMA DEBERÁ crear
  una `Edition` por cada edición del JSON (las 17 de 2009 a 2025), con su `year`
  igual al del JSON.
- **R1.2** CUANDO el script crea las ediciones EL SISTEMA DEBERÁ garantizar un
  `year` único por `Edition` (sin ediciones duplicadas para el mismo año).
- **R1.3** CUANDO una edición ya existe en la base (mismo `year`) y el script se
  ejecuta sin modo de reinicio EL SISTEMA DEBERÁ abortar con un error claro en
  lugar de duplicarla (ver R8).

## R2 — Personas

- **R2.1** CUANDO el script procesa el JSON EL SISTEMA DEBERÁ crear una `Person`
  por cada persona del JSON (las 21), con `name` igual al del JSON y `active`
  por defecto, sin `claimedByUserId`.
- **R2.2** CUANDO el script crea las personas EL SISTEMA DEBERÁ producir exactamente
  una `Person` por cada `personId` del JSON, sin duplicados por variantes de
  nombre (el JSON ya está deduplicado por `id`; el script mantiene esa relación
  1-a-1 y conserva un mapa `jsonPersonId → Person.id`).

## R3 — Catálogo de actividades: normalización y deduplicación

- **R3.1** CUANDO el script recolecta los nombres de actividad crudos del JSON
  EL SISTEMA DEBERÁ agruparlos por una **clave canónica** obtenida de forma
  determinista recortando espacios, colapsando espacios internos, eliminando
  diacríticos (tildes) y pasando a minúsculas, de modo que las variantes que sólo
  difieren en mayúsculas, tildes o espacios se resuelvan a una única `Activity`.
- **R3.2** CUANDO dos nombres crudos difieren por un error tipográfico y no sólo
  por mayúsculas/tildes/espacios (p. ej. `Lazamiento de disco` vs `Lanzamiento de
  disco`, `Petnca` vs `Petanca`, `Sprin` vs `Sprint`) EL SISTEMA DEBERÁ resolverlos
  a la misma `Activity` mediante un mapa de alias curado, aplicado antes de calcular
  la clave canónica.
- **R3.3** CUANDO el script crea el catálogo EL SISTEMA DEBERÁ crear exactamente
  una `Activity` por clave canónica (ninguna clave canónica genera dos filas de
  `Activity`).
- **R3.4** CUANDO varias variantes crudas comparten clave canónica EL SISTEMA
  DEBERÁ elegir como `name` de la `Activity` un nombre de presentación preferente
  (variante con tildes y mayúsculas correctas), de forma que p. ej. `fronton`/
  `Fronton`/`frontón`/`Frontón` produzcan una única `Activity` llamada `Frontón`,
  `Futbol`/`Fútbol` produzcan `Fútbol`, `catán`/`Catán` produzcan `Catán`, y
  `call of duty`/`Call of duty`/`Call of Duty` produzcan `Call of Duty`.
- **R3.5** CUANDO dos nombres crudos representan pruebas distintas aunque parezcan
  parecidos (p. ej. `Frontón` vs `Frontón parejas` vs `Frontón infantil`, o
  divisiones por edad `Jr.`) EL SISTEMA DEBERÁ mantenerlos como `Activity`
  distintas: sólo se fusionan variantes de mayúsculas/tildes/espacios (R3.1) y
  errores ortográficos inequívocos del mismo nombre listados en el mapa de alias
  (R3.2); no se fusionan sub-variantes semánticas (limitación documentada).
- **R3.6** CUANDO el `name` elegido para una `Activity` colisiona con el índice
  único case-insensitive `activities_name_lower_key` EL SISTEMA DEBERÁ tratarlo
  como un fallo de deduplicación (no debe ocurrir si R3.1-R3.4 se aplican antes de
  insertar) y abortar con un error claro en lugar de crear duplicados.

## R4 — Resultados, participantes y medallas

- **R4.1** CUANDO el script procesa cada `activityResult` real del JSON EL SISTEMA
  DEBERÁ crear un `ActivityResult` enlazado a la `Edition` de su año y a la
  `Activity` canónica de su nombre de actividad.
- **R4.2** CUANDO el script crea un `ActivityResult` EL SISTEMA DEBERÁ poblar su
  `participantIds` con **todas** las personas de `participants[]` (tengan medalla
  o no), traducidas a `Person.id`, sin duplicados.
- **R4.3** CUANDO un `participant` tiene `medal` no nulo EL SISTEMA DEBERÁ crear/
  añadir el `MedalAward` del color correspondiente (`gold`/`silver`/`bronze`) para
  esa `Person` en ese `ActivityResult`, agrupando a todas las personas del mismo
  color en un único `MedalAward` (empate/equipo, ADR 0004).
- **R4.4** CUANDO el script arma los `MedalAward` de un `ActivityResult` EL SISTEMA
  DEBERÁ garantizar como mucho un `MedalAward` por color, que toda persona con
  medalla esté también en `participantIds`, y que ninguna persona reciba dos
  medallas en la misma prueba (invariantes de dominio; equivalentes a las de la RPC
  `create_activity_result_with_awards`).
- **R4.5** CUANDO un `activityResult` del JSON no tiene participantes (artefacto
  `2021-054 "MEDALLERO"`) EL SISTEMA DEBERÁ omitirlo (no crear `ActivityResult`) y
  registrarlo en el log de resumen como fila omitida.

## R5 — Participación sin medalla como estado de primera clase

- **R5.1** CUANDO un `participant` tiene `medal: null` EL SISTEMA DEBERÁ incluir a
  esa `Person` en `participantIds` del `ActivityResult` **sin** crear ningún
  `MedalAward` para ella.
- **R5.2** CUANDO una `Person` no aparece en `participants[]` de una prueba EL
  SISTEMA DEBERÁ dejarla fuera de `participantIds` de ese `ActivityResult`,
  distinguiéndola así de quien participó sin medalla (R5.1).

## R6 — Consistencia con la hoja RESULTADOS y promedio por participación

- **R6.1** CUANDO la importación finaliza EL SISTEMA DEBERÁ producir un conjunto de
  `MedalAward` tal que, al agregar por persona el recuento de oros/platas/bronces,
  los totales coincidan con la suma directa de medallas del JSON de origen (los
  totales de la hoja RESULTADOS del xlsx) — verificable en test sin base de datos.
- **R6.2** CUANDO la importación finaliza EL SISTEMA DEBERÁ dejar los datos de
  forma que el "promedio de medallas por participación" (medallas de una persona ÷
  número de `ActivityResult` en los que figura en `participantIds`) sea calculable,
  gracias a que `participantIds` incluye a los participantes sin medalla (R5.1).

## R7 — Seguridad y credenciales (privilegios elevados)

- **R7.1** CUANDO el script escribe en Supabase EL SISTEMA DEBERÁ autenticarse con
  la **service role key** (lee `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del
  entorno), porque la importación crea datos históricos sin un usuario autenticado
  real y las políticas RLS de escritura exigen `has_claimed_person() = true`, que
  ningún usuario satisface para una carga masiva histórica.
- **R7.2** CUANDO se definen las variables de entorno del script EL SISTEMA DEBERÁ
  usar nombres **sin** prefijo `EXPO_PUBLIC_` (`SUPABASE_SERVICE_ROLE_KEY`, no
  `EXPO_PUBLIC_...`), de modo que Expo nunca las incluya en el bundle del cliente
  móvil.
- **R7.3** CUANDO se revisa el árbol de código EL SISTEMA DEBERÁ garantizar que la
  service role key y el cliente con privilegios elevados sólo se referencian dentro
  del script de importación (`src/scripts/`), y **nunca** desde `src/app/`,
  `src/components/` ni `src/services/` ni ningún código que se empaquete en la app
  — verificable con un test/grep automatizado.
- **R7.4** CUANDO falta `SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY` EL SISTEMA
  DEBERÁ abortar con un mensaje claro, sin crear un cliente con credenciales vacías
  y sin exponer el valor de las claves en logs.
- **R7.5** El script NUNCA debe comitear la service role key ni valores reales:
  `.env.example` documenta las variables con placeholders y `.env.local` (no
  versionado) contiene los valores reales.

## R8 — Idempotencia y seguridad de re-ejecución

- **R8.1** CUANDO el script arranca y detecta que ya existen datos de dominio
  (p. ej. `activity_results` o `editions` no vacías) y no se ha pedido modo de
  reinicio EL SISTEMA DEBERÁ abortar sin escribir, para no duplicar el histórico.
- **R8.2** CUANDO se ejecuta el script en modo reinicio explícito (flag `--reset`)
  EL SISTEMA DEBERÁ borrar los datos de dominio en orden seguro de claves foráneas
  antes de reimportar, dejando la base en el mismo estado que una primera carga.

## R9 — Ubicación, ejecución y desacople de la app

- **R9.1** CUANDO se implementa el script EL SISTEMA DEBERÁ vivir bajo `src/scripts/`
  (no en `src/app/`) y NO ser una pantalla ni un flujo de la app móvil.
- **R9.2** CUANDO se implementa el script EL SISTEMA DEBERÁ construir su propio
  cliente `@supabase/supabase-js` de Node y NO importar `@/services/supabase` (que
  es el cliente React Native con `AsyncStorage`/anon key), de modo que sea
  ejecutable en Node y `npm run typecheck` y `npm test` sigan en verde.
- **R9.3** CUANDO se documenta el script EL SISTEMA DEBERÁ describir en
  `supabase/README.md` cómo ejecutarlo (comando, variables de entorno, orden
  respecto a las migraciones) y justificar el uso de la service role key.
- **R9.4** CUANDO la lógica de transformación (normalización de nombres y
  construcción del plan de importación) se implementa EL SISTEMA DEBERÁ ser código
  puro y testeado con Jest en `src/__tests__/scripts/`, ejecutándose contra el
  propio `data/historico-medallas.json` sin necesidad de base de datos.
