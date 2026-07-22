# f-006-historic-ranking - Requisitos (EARS)

Clasificacion historica agregada de todas las ediciones (equivalente a la hoja
RESULTADOS del xlsx historico), con un ranking alternativo por eficiencia
(promedio de medallas por participacion).

## R1 - Ranking historico por medallas

- **R1.1** CUANDO cualquier usuario abre la clasificacion historica EL SISTEMA DEBERA mostrar un ranking ordenado agregando los `MedalAward` de todas las ediciones.
- **R1.2** CUANDO una persona tiene medallas en el historico EL SISTEMA DEBERA mostrar el desglose de oros, platas y bronces totales.
- **R1.3** CUANDO una persona tiene medallas EL SISTEMA DEBERA mostrar el total de medallas de esa persona.
- **R1.4** CUANDO varias personas empatan por oros EL SISTEMA DEBERA desempatar por platas, bronces, total de medallas, promedio y nombre.

## R2 - Participaciones y ranking por promedio

- **R2.1** CUANDO una persona figura en `participantIds` de una prueba de cualquier edicion EL SISTEMA DEBERA contar una participacion en su total historico.
- **R2.2** CUANDO una persona tiene participaciones EL SISTEMA DEBERA calcular el promedio como medallas totales divididas entre el numero total de participaciones.
- **R2.3** CUANDO una persona participa sin ganar ninguna medalla EL SISTEMA DEBERA mostrar su participacion y un promedio `0.00`.
- **R2.4** CUANDO el usuario elige el orden por promedio EL SISTEMA DEBERA reordenar el mismo ranking por promedio de medallas por participacion (desc), desempatando por total de medallas, oros, platas, bronces y nombre.

## R3 - Presentacion y acceso publico

- **R3.1** CUANDO el usuario alterna entre "por medallas" y "por promedio" EL SISTEMA DEBERA reordenar la misma lista sin volver a consultar el backend.
- **R3.2** CUANDO se registra un nuevo resultado en cualquier edicion EL SISTEMA DEBERA recalcular el ranking al volver a abrir/enfocar la vista.
- **R3.3** CUANDO todavia no hay ninguna prueba registrada EL SISTEMA DEBERA mostrar un estado vacio claro en vez de una lista en blanco.
- **R3.4** CUANDO el usuario no tiene sesion EL SISTEMA DEBERA permitir ver la clasificacion historica completa (solo lectura, sin ningun control de escritura).
