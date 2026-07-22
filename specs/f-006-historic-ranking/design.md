# f-006-historic-ranking - Diseno

Generaliza el patron de `f-005-edition-ranking` de una sola edicion a **todas las
ediciones agregadas**, y anade un segundo orden (por promedio de medallas por
participacion) sobre el mismo conjunto de datos.

## Servicio

`src/services/rankings.ts` (mismo archivo que f-005). Anadir
`listHistoricRanking(): Promise<HistoricRankingRow[]>` que calcula el ranking en
cliente leyendo las tablas publicas, sin filtrar por edicion:

- `people` (`id,name`, ordenado por nombre).
- `activity_results` (`id,participant_ids`) **sin filtro `edition_id`** (todas las ediciones).
- `medal_awards` (`result_id,medal,person_ids`) filtrado por `result_id in (...)` con los ids de todos los resultados; si no hay resultados, no se consulta `medal_awards`.

La forma de fila es identica a la de la edicion (personId, personName, gold,
silver, bronze, total, participations, medalsPerParticipation). Para no duplicar
logica ni romper f-005, extraer la agregacion comun (construccion de filas por
persona, conteo de participaciones desde `participant_ids`, conteo de medallas
desde `person_ids`, calculo del promedio `total / participations`) a un helper
interno reutilizado por `listEditionRanking` y `listHistoricRanking`. El tipo de
fila puede compartirse (p. ej. `RankingRow`, con `EditionRankingRow`/
`HistoricRankingRow` como alias) siempre que **los tests de f-005 sigan verdes sin
tocarlos**. No se persiste ranking.

Cada `personId` dentro de `MedalAward.person_ids` suma una medalla; empates y
victorias por equipo (varios `person_ids` en un mismo award) cuentan una medalla
para cada uno (coherente con f-004/f-005 y ADR 0004). Se filtran las personas sin
participaciones ni medallas.

### Ordenacion (dos criterios sobre la misma lista)

- **Por medallas** (defecto, equivalente a la hoja RESULTADOS): oro desc, plata desc, bronce desc, total desc, promedio desc, nombre asc (mismo comparador que f-005).
- **Por promedio** (eficiencia): promedio desc, total desc, oro desc, plata desc, bronce desc, nombre asc.

El servicio devuelve la lista ya ordenada por medallas; el reordenado por promedio
lo hace la pantalla en cliente (R3.1, sin nueva consulta). Exportar el comparador
por promedio (o una funcion `sortHistoricRanking(rows, mode)`) desde el servicio
para poder testearlo de forma aislada.

## Pantallas

- `src/app/rankings/historic.tsx`: pantalla publica unica (no hay selector, es una sola lista agregada). Carga con `useFocusEffect` (R3.2). Incluye un toggle "Por medallas" / "Por promedio" que reordena en cliente (R3.1) resaltando el criterio activo. Cada fila muestra `N. Nombre`, desglose `Oro x · Plata y · Bronce z`, total y, a la derecha, `participaciones` y `promedio` con dos decimales (misma presentacion que el detalle de f-005). Estado vacio con `EmptyState` cuando la lista esta vacia (R3.3). Sin ningun control de escritura (R3.4).

Registrar la ruta `rankings/historic` en `src/app/_layout.tsx` (titulo
"Clasificacion historica"), de forma aditiva junto a las rutas de rankings ya
existentes.

Home (`src/app/index.tsx`): mover/anadir una `NavCard` publica "Clasificacion
historica" en la seccion EXPLORAR (junto a "Clasificacion por edicion"),
navegando a `/rankings/historic`. Retirar de la seccion "PRÓXIMAMENTE" la tarjeta
placeholder de "Clasificaciones" en la parte que ya cubre el historico (dejar solo
lo que siga pendiente, p. ej. por actividad de f-007), sin romper los tests de
Home existentes.

## Acceso y permisos

Vista de **solo lectura**, accesible sin sesion. No escribe nada, por lo que no
requiere gating de escritura ni migracion ni politica RLS nueva: se apoya en la
lectura publica (`anon`) sobre `people`/`activity_results`/`medal_awards` ya
existente desde f-010. No debe aparecer ningun control de escritura en la pantalla.

## Tests

- Servicio (`src/__tests__/services/rankings.test.ts`, ampliando el existente): `listHistoricRanking` agrega varias ediciones (sin filtro `edition_id`), cuenta participaciones (incluida participacion sin medalla con promedio 0), y no consulta `medal_awards` cuando no hay resultados. Test del reordenado por promedio (comparador/`sortHistoricRanking`): una persona con menos medallas pero mayor promedio queda por delante en modo "por promedio" y por detras en modo "por medallas".
- App (`src/__tests__/app/rankings-historic.test.tsx`): render publico muestra desglose, total, participaciones y promedio; el toggle reordena la lista sin volver a llamar al servicio.
- Verificar que los tests de f-005 (`rankings.test.ts` existentes y `rankings-editions.test.tsx`) siguen verdes sin modificarlos.

## Notas / desviaciones (a rellenar por implementer si aplica)

- Posible umbral minimo de participaciones para el ranking por promedio: NO se implementa (no es criterio de aceptacion); se deja como nota para una feature futura si el promedio de muestras muy pequenas resulta enganoso.
