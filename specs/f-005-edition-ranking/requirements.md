# f-005-edition-ranking - Requisitos (EARS)

Clasificacion agregada de una edicion concreta.

## R1 - Ranking de edicion

- **R1.1** CUANDO cualquier usuario abre una edicion EL SISTEMA DEBERA mostrar ranking ordenado por medallas.
- **R1.2** CUANDO una persona tiene medallas en esa edicion EL SISTEMA DEBERA mostrar desglose de oros, platas y bronces.
- **R1.3** CUANDO varias personas empatan por oros EL SISTEMA DEBERA desempatar por platas, bronces, total de medallas, promedio y nombre.

## R2 - Participaciones y promedio

- **R2.1** CUANDO una persona figura en `participantIds` de una prueba de la edicion EL SISTEMA DEBERA contar una participacion.
- **R2.2** CUANDO una persona gana medallas EL SISTEMA DEBERA calcular promedio como medallas totales divididas entre participaciones.
- **R2.3** CUANDO una persona participa sin ganar medalla EL SISTEMA DEBERA mostrar su participacion y promedio `0.00`.

## R3 - Actualizacion y acceso publico

- **R3.1** CUANDO se registra un nuevo resultado EL SISTEMA DEBERA recalcular el ranking al volver a abrir/enfocar la vista.
- **R3.2** CUANDO el usuario no tiene sesion EL SISTEMA DEBERA permitir ver selector y ranking.

