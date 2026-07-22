# f-018-person-performance-charts - Diseño

## Contexto de partida (verificado en código)

- `src/services/activityResults.ts::listPersonHistory(personId)` (f-017) ya devuelve, para
  **todas** las pruebas en las que participó una persona, `PersonHistoryEntry[]`: `resultId`,
  `editionId`, `editionYear`, `editionLabel`, `activityId`, `activityName`, `playedAt`,
  `medal: Medal | null` (medalla propia de esa persona en esa prueba, `null` = participó sin
  medalla). Sin filtro adicional, cero coste de red extra: ya se pide en
  `people/[id]/index.tsx` para el histórico (R4.2).
- `src/services/rankings.ts` tiene `MEDAL_VALUES: Record<Medal, number>` (`gold: 3, silver: 2,
  bronze: 1`), hoy privada (no exportada), usada por `buildRanking` para `score`/`scorePerParticipation`.
- No hay ninguna librería de gráficos instalada (`package.json` no tiene `victory-native`,
  `react-native-svg-charts`, `react-native-chart-kit`, etc.). `react-native-svg` solo está
  como dependencia de `GoogleGLogo.tsx` (icono estático).

## Decisión: sin librería de gráficos ni SVG — barras con `View` + flexbox

Se descarta instalar una librería de charts: para 2-3 visualizaciones simples (barras
horizontales proporcionales) es una dependencia nueva para muy poco beneficio, contra la
convención del proyecto de no añadir dependencias innecesarias. Se descarta también construir
las barras a mano con `react-native-svg` (ya instalado): añade complejidad de `viewBox`/layout
sin necesidad, y las barras se pueden expresar con `View` + `width: '{pct}%'` dentro de un
contenedor con `overflow: 'hidden'`, igual que cualquier otro layout de la app — más simple de
testear con React Native Testing Library (se lee el `style` renderizado, no hay que interpretar
un `<svg>`).

Cada "barra" es una fila: etiqueta (edición o actividad) + una pista (`track`, `View` con
`backgroundColor: colors.surfaceAlt`, altura fija ~8px, `borderRadius: radius.pill`) que
contiene una `View` hija (`fill`, `backgroundColor: colors.gradientFrom` o similar) con
`width: ${pct}%` donde `pct = max > 0 ? (valor / max) * 100 : 0`; valor numérico a la derecha.

## 1. Agregación (`src/services/rankings.ts`) — sin queries nuevas (R4.2)

Se exporta `MEDAL_VALUES` (ya existe, solo se le quita el scope privado) y se añaden dos
funciones **puras** (sin `async`, sin Supabase) que reciben el `PersonHistoryEntry[]` que la
pantalla ya carga vía `listPersonHistory`:

```ts
import type { PersonHistoryEntry } from './activityResults';

export interface PersonEditionBreakdownRow {
  editionId: string;
  editionYear: number;
  editionLabel: string | null;
  score: number;
  participations: number;
  scorePerParticipation: number;
}

export interface PersonActivityBreakdownRow {
  activityId: string;
  activityName: string;
  score: number;
  participations: number;
  scorePerParticipation: number;
}

export function buildPersonEditionBreakdown(history: PersonHistoryEntry[]): PersonEditionBreakdownRow[];
export function buildPersonActivityBreakdown(history: PersonHistoryEntry[]): PersonActivityBreakdownRow[];
```

`buildPersonEditionBreakdown`:
1. Agrupar `history` por `editionId` (`Map`), acumulando `score += entry.medal ? MEDAL_VALUES[entry.medal] : 0`
   y `participations += 1` (cada entrada de `PersonHistoryEntry` es una prueba, participó
   con o sin medalla).
2. `scorePerParticipation = participations === 0 ? 0 : score / participations` (participations
   nunca es 0 aquí porque solo se crean grupos a partir de entradas existentes).
3. Ordenar por `editionYear` ascendente (R1.2, lectura como progresión temporal — al contrario
   que las listas de ranking, que van de más a menos reciente).

`buildPersonActivityBreakdown`:
1. Igual agregación que arriba pero agrupando por `activityId`/`activityName`.
2. Ordenar por `scorePerParticipation` descendente; empate por `score` descendente; empate por
   `activityName` (`localeCompare`) ascendente (R3.2/R3.3, mismo criterio de desempate que
   `compareByAverage` en el resto del fichero).

Ambas funciones son agregaciones puras de datos ya en memoria: no se toca `fetchAllRows` ni
ninguna query — coherente con R4.2 y con el patrón ya usado en `listPersonSummary` (f-017) de
no duplicar cálculo de puntuación.

## 2. Componentes de presentación nuevos (`src/components/people/`)

Mismo patrón que `src/components/rankings/EditionRankingList.tsx` (componente presentacional
puro, recibe los datos ya calculados, sin `fetch` propio):

- **`PersonEditionBarChart.tsx`**: recibe `rows: PersonEditionBreakdownRow[]`. Por cada fila:
  etiqueta `${editionYear}${editionLabel ? ' · ' + editionLabel : ''}`, barra de puntos (barra
  proporcional al `score` máximo entre las filas) con el valor en puntos a la derecha, y debajo
  una segunda línea de texto con el promedio (`scorePerParticipation.toFixed(2)` + "puntos/participación").
  No es necesaria una segunda barra separada para el promedio (R2.1 se satisface mostrando el
  número); dos pistas de barra por fila sería ruido visual para un valor que ya se lee bien como
  texto.
- **`PersonActivityBreakdownList.tsx`**: recibe `rows: PersonActivityBreakdownRow[]` (ya
  ordenadas por el servicio). Reutiliza `Card`/`ListRow`/`Divider` (como `EditionRankingList`):
  `title` = `${index + 1}. ${activityName}`, `right` = promedio en grande (`scorePerParticipation.toFixed(2)`)
  + caption `${score} pts · ${participations} part.` — mismo lenguaje visual que las pantallas
  de ranking existentes (`rankings/activities/[id].tsx`), para que el usuario reconozca el
  patrón "posición + valor grande + detalle pequeño".

Ambos componentes están en `src/components/people/` (no `src/components/rankings/`) porque
consumen tipos y datos **pivotados a una persona**, no filas de `RankingRow` genéricas —
distingue claramente "ranking de todos" (existente) de "desglose de uno" (nuevo).

## 3. Integración en `people/[id]/index.tsx`

- Tras cargar `historyEntries` (ya se hace hoy), derivar en el propio componente (sin nuevo
  estado de carga, son cálculos síncronos sobre datos ya en memoria):
  ```ts
  const editionBreakdown = useMemo(() => buildPersonEditionBreakdown(history), [history]);
  const activityBreakdown = useMemo(() => buildPersonActivityBreakdown(history), [history]);
  ```
- Nueva sección "Rendimiento por edición" con `<PersonEditionBarChart rows={editionBreakdown} />`
  y sección "Actividades" con `<PersonActivityBreakdownList rows={activityBreakdown} />`.
- **Ambas secciones se omiten por completo si `history.length === 0`** (R4.1): se colocan
  dentro del mismo `history.length === 0 ? <EmptyState .../> : (<>...secciones existentes de
  histórico... + nuevas secciones de gráficos...</>)` que ya existe, para no duplicar el
  estado vacío.
- No dependen de `canWrite` ni de `person.active` (R5.1/R5.2): se renderizan igual que el
  resto del contenido de solo lectura de la pantalla.

## 3.1. Addendum: pestañas para reducir el scroll (feedback de usuario post-entrega)

Con datos reales, una persona con historial largo (ej. 700+ participaciones, 300+ actividades
distintas) convertía la pantalla en un scroll único kilométrico. Se divide el contenido en 3
pestañas (`DetailTab`: `'summary' | 'history' | 'activities'`, estado local `activeTab`, por
defecto `'summary'`), con un selector de 3 botones (mismo patrón que el toggle "Por medallas"/
"Por promedio" de las pantallas de ranking, pero con 3 opciones en vez de 2):

- **Resumen** (por defecto): tarjeta de resumen de medallas + `PersonEditionBarChart` (si
  `history.length > 0`).
- **Histórico**: la lista completa de `PersonHistoryEntry` (o `EmptyState` si está vacía).
- **Actividades**: `PersonActivityBreakdownList` (o un `EmptyState` "Sin actividades" nuevo si
  `activityBreakdown.length === 0` — antes esta sección no tenía su propio estado vacío porque
  vivía en el mismo scroll que el histórico, cuyo `EmptyState` ya cubría el caso).

No se carga nada nuevo al cambiar de pestaña: `history`/`summary` ya están en memoria, cambiar
`activeTab` solo cambia qué `View` se renderiza. El FAB y el botón "Editar persona" quedan fuera
de las pestañas (siempre visibles/ocultos según `canWrite`, sin relación con la pestaña activa).

## 4. Casos borde

- **Persona sin pruebas (R4.1):** `history` es `[]`; `buildPersonEditionBreakdown`/
  `buildPersonActivityBreakdown` devuelven `[]`, pero ni siquiera se llaman a renderizar porque
  la rama `history.length === 0` ya corta antes (ver sección 3).
- **Una sola edición o actividad (R1.3):** `max` = el único valor, `pct = 100`; se renderiza una
  fila igual que con varias.
- **Participación sin medalla:** cuenta para `participations` pero aporta `0` a `score` (ya es
  el comportamiento natural de la agregación, ninguna rama especial).
- **Persona inactiva (R5.2):** sin cambios respecto a f-017; estas secciones no miran
  `person.active`.

## 5. Modelo de datos

Sin cambios de esquema ni de RLS. Solo agregación en cliente sobre datos ya leídos por
`listPersonHistory` (tablas públicas existentes: `activity_results`, `medal_awards`,
`editions`, `activities`).

## 6. Tests

- `rankings.ts`: tests unitarios de `buildPersonEditionBreakdown` y `buildPersonActivityBreakdown`
  (agregación multi-edición/actividad, orden correcto, desempates de R3.3, entrada vacía → `[]`,
  participación sin medalla no rompe el promedio).
- Componentes: test de `PersonEditionBarChart` (render de etiquetas/valores, barra al 100% con
  una sola fila) y `PersonActivityBreakdownList` (orden ya viene dado, solo verifica render).
- `people-id.test.tsx` (ya existente de f-017): añadir casos de persona con histórico en varias
  ediciones/actividades (secciones nuevas visibles con los valores esperados) y persona sin
  histórico (secciones nuevas ausentes, R4.1).
- `npx tsc --noEmit` limpio y `npm test` en verde.
