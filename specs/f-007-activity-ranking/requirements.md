# f-007-activity-ranking - Requisitos (EARS)

Histórico de una actividad concreta a lo largo de todas las ediciones en las que
se ha jugado, con su propia clasificación agregada (equivalente a la hoja CATAN
del xlsx histórico, generalizada a cualquier actividad). La clasificación se
calcula **solo dentro de esa actividad**, no de forma global, y muestra el
promedio de medallas por participación en la actividad (quién rinde mejor por
partida jugada, no solo quién acumula más).

## R1 - Elegir una actividad

- **R1.1** CUANDO cualquier usuario abre la clasificación por actividad EL SISTEMA DEBERA mostrar el catálogo de actividades para elegir una.
- **R1.2** CUANDO el usuario escribe en el buscador EL SISTEMA DEBERA filtrar las actividades por coincidencia de nombre (reutilizando `searchActivities` de `f-003`, ignorando mayúsculas/minúsculas).
- **R1.3** CUANDO el usuario selecciona una actividad EL SISTEMA DEBERA abrir la vista del histórico y la clasificación de esa actividad concreta.
- **R1.4** CUANDO todavía no hay ninguna actividad en el catálogo EL SISTEMA DEBERA mostrar un estado vacío claro en vez de una lista en blanco.

## R2 - Histórico de pruebas de la actividad

- **R2.1** CUANDO el usuario abre una actividad EL SISTEMA DEBERA listar todas las pruebas (`ActivityResult`) de esa actividad a lo largo de **todas** las ediciones en las que se jugó (sin filtrar por edición).
- **R2.2** CADA prueba del histórico DEBERA mostrar la edición (año) a la que pertenece y las medallas otorgadas en ella, con el color (oro/plata/bronce) y las personas que ganaron cada una.
- **R2.3** CADA prueba del histórico DEBERA mostrar cuántas personas participaron en ella (tamaño de `participantIds`).
- **R2.4** CUANDO la actividad tiene varias pruebas EL SISTEMA DEBERA ordenarlas de la edición más reciente a la más antigua.
- **R2.5** CUANDO la actividad seleccionada no tiene ninguna prueba registrada EL SISTEMA DEBERA mostrar un estado vacío claro.

## R3 - Clasificación agregada de esa actividad

- **R3.1** CUANDO el usuario abre una actividad EL SISTEMA DEBERA mostrar una clasificación agregando **solo** los `MedalAward` de las pruebas de esa actividad (no un ranking global).
- **R3.2** CUANDO una persona tiene medallas en esa actividad EL SISTEMA DEBERA mostrar el desglose de oros, platas y bronces y el total dentro de la actividad.
- **R3.3** CUANDO una persona figura en `participantIds` de una prueba de la actividad EL SISTEMA DEBERA contar una participación en esa actividad y calcular el promedio como medallas en la actividad divididas entre participaciones en la actividad.
- **R3.4** CUANDO una persona participa en la actividad sin ganar ninguna medalla EL SISTEMA DEBERA mostrar su participación con un promedio `0.00`.
- **R3.5** CUANDO varias personas empatan por oros EL SISTEMA DEBERA desempatar por platas, bronces, total de medallas, promedio y nombre.
- **R3.6** CUANDO el usuario elige el orden por promedio EL SISTEMA DEBERA reordenar la misma clasificación en cliente (sin volver a consultar el backend), desempatando por total de medallas, oros, platas, bronces y nombre.

## R4 - Presentación y acceso público

- **R4.1** CUANDO el usuario no tiene sesión EL SISTEMA DEBERA permitir ver la selección de actividad, el histórico de pruebas y la clasificación por actividad (solo lectura).
- **R4.2** CUANDO se muestra cualquiera de estas vistas EL SISTEMA NO DEBERA mostrar ningún control de escritura (crear/editar/registrar).
- **R4.3** CUANDO se registra un nuevo resultado de la actividad EL SISTEMA DEBERA recalcular el histórico y la clasificación al volver a abrir/enfocar la vista.
- **R4.4** La vista NO requiere migración ni política RLS nueva: se apoya en la lectura pública (`anon`) sobre `activities`/`editions`/`activity_results`/`medal_awards`/`people` ya existente desde `f-010`.
