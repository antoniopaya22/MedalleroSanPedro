# f-005-edition-ranking - Diseno

## Servicio

`src/services/rankings.ts` calcula ranking en cliente, leyendo tablas publicas:

- `people`
- `activity_results` filtrado por `edition_id`
- `medal_awards` filtrado por `result_id in (...)`

No se almacena ranking. Cada `personId` dentro de `MedalAward.personIds` suma una
medalla a esa persona. Participaciones salen solo de `ActivityResult.participantIds`.

Orden: oro desc, plata desc, bronce desc, total desc, promedio desc, nombre asc.

## Pantallas

- `src/app/rankings/editions/index.tsx`: selector publico de edicion.
- `src/app/rankings/editions/[id].tsx`: ranking publico, recarga con `useFocusEffect`.

Home anade entrada publica "Clasificacion por edicion".

## Tests

- Servicio: agregacion, participacion sin medalla, orden y edicion vacia.
- App: selector publico y detalle renderiza desglose/promedio.

