# ADR 0004: Medalla como entidad con varias personas (soporta individual y equipos)

## Estado

Aceptado.

## Contexto

Al analizar `historico-medallas.xlsx` se observa que una misma actividad puede jugarse de forma individual (una persona por medalla) o por equipos (varias personas comparten la misma medalla en la misma prueba — p. ej. en pruebas de Voleibol/Fútbol por equipos, varias columnas tienen `ORO` en la misma fila). El histórico no distingue explícitamente "modo individual" vs "modo equipo" como un campo: simplemente hay más de una persona con el mismo color en la misma fila cuando fue por equipos.

## Decisión

- No se modela un campo `teamMode` en `Activity` ni en `ActivityResult`. En su lugar, `MedalAward` tiene `personIds: string[]` (una o varias personas). Un empate o una victoria por equipo se representa igual: varias `personIds` bajo el mismo `MedalAward`.
- Regla de integridad: como mucho un `MedalAward` por color (`ORO`/`PLATA`/`BRONCE`) por `ActivityResult`, y una persona no puede aparecer en más de un `MedalAward` del mismo `ActivityResult`.
- La UI de registro de resultados (`f-004-medal-results-registration`) deja elegir, para cada color de medalla, una o varias personas de una lista (selector multi-persona), sin necesidad de que el admin declare de antemano si la prueba es individual o por equipos.

## Consecuencias

- El modelo es uniforme para individual y equipos: no hay una tabla `Team` separada ni un campo de modalidad que mantener sincronizado.
- Las agregaciones de ranking (`f-005`/`f-006`/`f-007`) simplemente cuentan, por persona, en cuántos `MedalAward` de cada color aparece — funciona igual sin importar si la prueba fue individual o por equipos.

## Disparador para reconsiderar

Si en el futuro se necesita nombrar/persistir equipos concretos (p. ej. "Equipo Rojo" con su propio histórico independiente de qué personas lo forman cada año), esto requeriría una entidad `Team` nueva y reabrir este ADR.
