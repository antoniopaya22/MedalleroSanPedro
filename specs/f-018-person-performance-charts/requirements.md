# f-018-person-performance-charts - Requisitos

## Contexto

`f-017-person-detail-view` (`done`) añadió `/people/[id]` como vista de detalle pública de
un participante: cabecera, resumen de medallas agregado (`listPersonSummary`) e histórico de
pruebas (`listPersonHistory`). Esta feature añade, en esa misma vista, gráficos de
rendimiento propios de esa persona: puntos por edición, promedio de puntos por participación
por edición, y sus actividades ordenadas por su propio mejor promedio.

"Puntos" = el sistema de puntuación ya vigente en toda la app (oro=3, plata=2, bronce=1,
`MEDAL_VALUES` en `src/services/rankings.ts`), no el recuento plano de medallas.

## Requisitos (EARS)

**R1 — Gráfico de puntos por edición**
- R1.1: CUANDO se carga `/people/[id]` de una persona con al menos una prueba registrada, EL
  SISTEMA DEBERÁ mostrar un gráfico con los puntos obtenidos por esa persona en cada edición
  en la que participó (una barra/entrada por edición).
- R1.2: EL SISTEMA DEBERÁ ordenar las ediciones del gráfico de más antigua a más reciente (lectura
  como progresión temporal).
- R1.3: SI la persona participó en una única edición, ENTONCES EL SISTEMA DEBERÁ mostrar el
  gráfico con esa única entrada (no ocultarlo ni mostrarlo roto).

**R2 — Promedio de puntos por participación por edición**
- R2.1: EL SISTEMA DEBERÁ mostrar, junto a (o como parte de) el gráfico de R1, el promedio de
  puntos por participación de esa persona en cada una de esas mismas ediciones (puntos de la
  edición ÷ nº de pruebas en las que participó esa persona en esa edición).

**R3 — Ranking de actividades por promedio propio**
- R3.1: EL SISTEMA DEBERÁ mostrar un listado de las actividades en las que ha participado esa
  persona, cada una con su propio promedio de puntos por participación en esa actividad.
- R3.2: EL SISTEMA DEBERÁ ordenar ese listado de mayor a menor promedio.
- R3.3: SI dos actividades tienen el mismo promedio, ENTONCES EL SISTEMA DEBERÁ desempatar por
  puntos totales en esa actividad (mayor primero) y, si persiste el empate, por nombre de
  actividad (alfabético).

**R4 — Casos vacíos/borde**
- R4.1: SI la persona no tiene ninguna prueba registrada (`listPersonHistory` devuelve `[]`),
  ENTONCES EL SISTEMA NO DEBERÁ mostrar ninguna sección de gráficos (el estado vacío del
  histórico de pruebas, ya existente en f-017, es suficiente; no se duplica un segundo estado
  vacío).
- R4.2: Los gráficos y el listado de actividades NO DEBERÁN requerir ninguna consulta nueva a
  Supabase: DEBERÁN calcularse agregando en cliente los datos que ya devuelve
  `listPersonHistory(personId)` (mismo principio que f-017 R1.4: no duplicar agregación).

**R5 — Visibilidad**
- R5.1: Los gráficos DEBERÁN ser visibles sin necesidad de iniciar sesión, igual que el resto
  de la vista de detalle (f-017 R2.1) — no dependen de `canWrite`.
- R5.2: Los gráficos DEBERÁN mostrarse igual para una persona activa o inactiva (mismo criterio
  que f-017 R5.3: el histórico es un hecho del pasado).
