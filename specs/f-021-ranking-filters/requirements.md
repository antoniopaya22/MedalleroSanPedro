# f-021-ranking-filters - Requisitos

## Contexto

Encuesta de pantallas de listado/clasificación (ver `progress/history.md`/conversación): de las
4 pantallas de ranking (histórico, por edición, por actividad, detalle de edición) solo 2 tienen
un toggle "por puntos"/"por promedio"; el listado de Participantes no tiene ningún filtro; el
histórico de pruebas de una actividad no se puede acotar a una edición concreta. Esta feature
cierra esas 4 inconsistencias/carencias concretas señaladas por el usuario.

No se añade búsqueda a los listados planos de Ediciones (`editions/index.tsx`,
`rankings/editions/index.tsx`): con ~17 filas (una por año) un buscador no aporta valor
proporcional a su coste, y no fue parte de lo pedido.

## Requisitos (EARS)

**R1 — Rango de años en Clasificación histórica**
- R1.1: CUANDO se carga `/rankings/historic`, EL SISTEMA DEBERÁ ofrecer 3 opciones de rango:
  "Todas", "Últimos 5 años", "Últimos 10 años", con "Todas" seleccionada por defecto.
- R1.2: EL "año más reciente" para calcular los rangos DEBERÁ ser el año de la edición más
  reciente que exista en los datos (no la fecha real del dispositivo): "Últimos 5 años" con
  máximo 2025 significa ediciones con año ∈ [2021, 2025].
- R1.3: AL cambiar de rango, EL SISTEMA DEBERÁ recalcular puntos/promedio agregando solo las
  ediciones dentro de ese rango (no un recorte visual de una lista ya agregada globalmente).
- R1.4: SI ninguna edición cae dentro del rango elegido, ENTONCES EL SISTEMA DEBERÁ mostrar el
  estado vacío existente de la pantalla, no un ranking roto.
- R1.5: El toggle "Por medallas"/"Por promedio" ya existente DEBERÁ seguir funcionando en
  cliente sobre el ranking ya filtrado por rango de años (sin recargar al cambiar de orden).

**R2 — Búsqueda y filtro en Participantes**
- R2.1: EL SISTEMA DEBERÁ ofrecer un buscador de texto que filtre el listado de personas por
  nombre (contiene, insensible a mayúsculas/tildes-no-normalizadas igual que el buscador ya
  existente de actividades).
- R2.2: EL SISTEMA DEBERÁ ofrecer un filtro de 3 opciones: "Todos", "Activos", "Inactivos".
- R2.3: Ambos filtros DEBERÁN combinarse (AND): el buscador solo busca dentro del subconjunto
  ya filtrado por estado activo/inactivo, o viceversa.
- R2.4: SI la combinación de filtros no deja ningún resultado, ENTONCES EL SISTEMA DEBERÁ
  mostrar un estado vacío de "sin resultados" distinto del de "todavía no hay personas".
- R2.5: Ambos filtros son puramente en cliente sobre el listado ya cargado (sin refetch).

**R3 — Toggle en Clasificación por edición**
- R3.1: EL SISTEMA DEBERÁ mostrar en `/rankings/editions/[id]` el mismo toggle "Por puntos"/
  "Por promedio" que ya existe en Histórico y en Actividad, reutilizando `sortRanking`.
- R3.2: El comportamiento (reordena en cliente, sin refetch) DEBERÁ ser idéntico al de las otras
  dos pantallas de ranking.

**R4 — Filtro por edición en histórico de actividad**
- R4.1: EL SISTEMA DEBERÁ mostrar, en el detalle de una actividad (`/rankings/activities/[id]`),
  un filtro (chips) con "Todas" + una entrada por cada edición en la que se jugó esa actividad.
- R4.2: AL seleccionar una edición, EL SISTEMA DEBERÁ acotar la lista de "Histórico de pruebas"
  a esa edición, sin volver a consultar el backend (los datos ya están cargados).
- R4.3: La sección "Clasificación" de esa misma pantalla NO CAMBIA con este filtro (sigue
  agregando todas las ediciones); el filtro solo afecta al histórico de pruebas.

**R5 — Visibilidad**
- R5.1: Todos los filtros de esta feature DEBERÁN ser accesibles sin necesidad de iniciar
  sesión, igual que el resto de estas pantallas (son de solo lectura).
