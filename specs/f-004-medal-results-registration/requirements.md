# f-004-medal-results-registration - Requisitos (EARS)

Registro de una prueba (`ActivityResult`) dentro de una `Edition`, eligiendo una
`Activity`, el censo completo de participantes y las medallas `gold`/`silver`/
`bronze`.

## R1 - Alta de prueba

- **R1.1** CUANDO un usuario con `Person` reclamada abre el registro de prueba EL SISTEMA DEBERA mostrar formulario de edicion, actividad, participantes, fecha opcional, notas opcionales y medallas.
- **R1.2** CUANDO confirma datos validos EL SISTEMA DEBERA crear un `ActivityResult` y sus `MedalAward` asociados de forma atomica.
- **R1.3** CUANDO falta edicion, actividad, participantes o medallas EL SISTEMA DEBERA impedir el guardado y mostrar validacion sin llamar al backend.

## R2 - Actividad existente o nueva

- **R2.1** CUANDO el usuario busca actividad EL SISTEMA DEBERA mostrar coincidencias existentes case-insensitive.
- **R2.2** CUANDO el usuario selecciona una actividad existente EL SISTEMA DEBERA reutilizarla para la prueba.
- **R2.3** CUANDO el usuario crea una actividad nueva desde el registro EL SISTEMA DEBERA crearla, seleccionarla y evitar duplicados con el error reconocible de `f-003`.

## R3 - Participacion y medallas

- **R3.1** CUANDO el usuario selecciona participantes EL SISTEMA DEBERA guardar todos sus ids en `participantIds`, ganen medalla o no.
- **R3.2** CUANDO asigna una medalla EL SISTEMA DEBERA permitir una o varias personas por color.
- **R3.3** CUANDO una persona recibe medalla EL SISTEMA DEBERA asegurar que figura entre participantes.
- **R3.4** CUANDO una persona ya tiene una medalla en la prueba EL SISTEMA NO DEBERA permitir otra medalla distinta para esa misma prueba.

## R4 - Permisos

- **R4.1** MIENTRAS el usuario sea anonimo o autenticado sin `Person` reclamada EL SISTEMA NO DEBERA mostrar ni permitir controles de registro.
- **R4.2** CUANDO el backend recibe escritura EL SISTEMA DEBERA depender de RLS `activity_results_write_claimed_person` y `medal_awards_write_claimed_person`.

