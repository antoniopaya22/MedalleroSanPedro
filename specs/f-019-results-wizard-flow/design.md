# f-019-results-wizard-flow - Diseno

## Contexto de partida (codigo real de hoy)

`src/app/results/new.tsx` es HOY un unico componente `NewResultScreen` con:

- Un guard `canWrite` (`useEffect` -> `router.replace('/')` + `return null`).
- Carga inicial con `Promise.all([listEditions(), listActivities(), listPeople()])`
  y preseleccion desde params de ruta ya soportados: `editionId` (f-016, fija
  `selectedEditionId`) y `participantId` (f-017, anade a `participantIds` solo si la
  persona esta entre las activas cargadas).
- Estado plano en el componente: `selectedEditionId`, `selectedActivityId`,
  `activityQuery`, `participantIds`, `medals` (`{ gold, silver, bronze }`), `playedAt`,
  `notes`, mas flags `loading`/`saving`/`creatingActivity`/`error`/`activityError`.
- Toda la UI en un `ScrollView` con un `SectionCard` por bloque: (1) Edicion,
  (2) Actividad, (3) Participantes, y luego un `SectionCard` por color de medalla (numeros
  4/5/6) y (7) Detalles. El boton "Guardar prueba" vive en una barra inferior fija.
- Handlers: `toggleParticipant`, `toggleMedal`, `handleCreateActivity`, `handleSave`
  (este ultimo valida en cascada edicion -> actividad -> participantes -> medallas con los
  mensajes exactos, y llama a `createActivityResult`).

**Objetivo de esta feature:** reorganizar SOLO *cuando* se muestra cada bloque
(un paso a la vez) y anadir validacion de "no avanzar sin completar el paso actual".
Todo lo demas (estado, handlers, carga, preseleccion, guardado, validaciones y sus
mensajes) se conserva. `createActivityResult` NO se toca.

## 1. Decision de estructura: un solo archivo con estado de "paso actual"

Se mantiene un **unico archivo** `src/app/results/new.tsx` con un **unico componente
`NewResultScreen`** que conserva TODO el estado actual tal cual, y se le anade un estado
nuevo `currentStep`. NO se crean rutas nuevas de expo-router (la navegacion entre pasos es
estado interno del componente, R1.3/R1.4).

Justificacion (coherente con `docs/conventions.md`, "sin abstracciones prematuras"):

- El estado del wizard tiene que ser **compartido** entre todos los pasos (participantes
  del paso 3 alimentan el paso 4 de medallas y el resumen del paso 6). Un unico componente
  con el estado ya existente evita levantar el estado a un contexto o prop-drilling.
- Cada "paso" se renderiza como un **subcomponente de presentacion sin estado propio**
  definido en el mismo archivo (o bien un `switch (currentStep)` que renderiza el bloque
  correspondiente), reutilizando el `SectionCard` y los `Card`/`ListRow`/`TextField`/
  `Divider` ya existentes. No se crea una carpeta nueva ni un sistema de wizard generico:
  es un wizard concreto de 6 pasos para esta pantalla.

Enumeracion de pasos (indice 0-5 internamente; se muestra 1-6 al usuario):

```
enum Step { Edition, Activity, Participants, Medals, Details, Summary } // 6 pasos
```

Constante con los titulos en espanol para el indicador y las cabeceras:
`['Edicion', 'Actividad', 'Participantes', 'Medallas', 'Detalles', 'Resumen']`.

## 2. Estado nuevo y navegacion Atras/Siguiente

- Nuevo estado: `const [currentStep, setCurrentStep] = useState<number>(0)` (0 = Edicion).
  El paso inicial real se ajusta segun preseleccion (seccion 5).
- `goNext()`: valida el paso actual (seccion 3); si pasa, limpia `error` y hace
  `setCurrentStep((s) => Math.min(s + 1, LAST_STEP))`.
- `goBack()`: limpia `error` y hace `setCurrentStep((s) => Math.max(s - 1, 0))`.
- `goToStep(step)`: usado desde el Resumen para volver a corregir un paso concreto
  (R4.3); limpia `error` y fija `currentStep`.
- Barra inferior fija (se reutiliza el `View` inferior actual): en pasos 0-4 muestra
  "Atras" (oculto/deshabilitado en el paso 0) + "Siguiente"; en el paso 5 (Resumen) muestra
  "Atras" + "Guardar prueba" (el actual `handleSave`). "Atras" como `Button variant="outline"`
  o `ghost`, "Siguiente"/"Guardar" como `Button` primario. El `ErrorBanner` sigue encima
  de esa barra, como hoy.

## 3. Validacion por paso (reutiliza los mensajes exactos de hoy)

Se **descompone** la cascada de `handleSave` en una funcion `validateStep(step)` que
devuelve el mensaje de error o `null`, reutilizando literalmente los mismos textos:

- Step Edition: `!selectedEditionId` -> "Elige una edicion." (R3.1)
- Step Activity: `!selectedActivityId` -> "Elige una actividad." (R3.2)
- Step Participants: `participantIds.length === 0` -> "Selecciona al menos un participante." (R3.3)
- Step Medals: `MEDALS.every(({ medal }) => medals[medal].length === 0)` -> "Asigna al menos una medalla." (R3.4)
- Step Details: siempre valido (R3.5).
- Step Summary: no valida al "entrar"; el guardado usa `handleSave`.

`goNext()` hace `const msg = validateStep(currentStep); if (msg) { setError(msg); return; }
setError(null); avanzar`. Al cambiar de paso con "Atras" tambien se limpia `error` (R3.6).

`handleSave` (paso Resumen) se mantiene TAL CUAL: como el usuario solo llega al Resumen
tras superar la validacion de cada paso, las comprobaciones internas de `handleSave`
quedan como red de seguridad redundante y no se eliminan (garantiza R6.2: mismo payload,
mismas reglas). En caso de error de guardado el componente permanece en el paso Resumen
(no cambia `currentStep`) y muestra el error igual que hoy (R4.5).

## 4. Indicador de progreso (primitivas existentes, sin sistema nuevo)

Se anade un indicador simple en la parte superior del contenido, por encima del bloque del
paso, usando SOLO primitivas ya existentes / `View` + `Text` del design system:

- Texto "Paso {currentStep + 1} de 6" con `<Text variant="caption" color="textSecondary">`.
- Titulo del paso actual con `<Text variant="subtitle">` (reutilizando el patron de
  cabecera de `SectionCard`).
- Barra de progreso: un `View` contenedor (fondo `colors.surfaceAlt`, `height` fina,
  `borderRadius: radius.pill`) con un `View` interior de `width: '{(step+1)/6*100}%'` y
  `backgroundColor: colors.primary`. Mismo enfoque de barras con flexbox/`width %` que ya
  usa f-018 en sus graficos; NO se anade libreria ni SVG.
- Alternativa admitida (a criterio del implementer, misma familia visual): fila de 6 dots
  (`View` circulares) donde los <= al paso actual usan `colors.primary` y el resto
  `colors.border`. Preferencia: la barra, por simplicidad. No se introduce ningun
  componente nuevo en `src/components/ui` para esto (un solo uso, no alcanza el umbral de
  2-3 de `conventions.md`).

`SectionCard` ya no necesita numerar (1..7) porque ahora solo hay un bloque en pantalla;
se puede reutilizar `SectionCard` para el titulo del bloque, o simplemente el titulo del
indicador. El paso Medallas renderiza los TRES colores (oro/plata/bronce) juntos dentro del
mismo paso, cada uno con su `SectionCard`/`Card` y su `accentColor` como hoy, en un
`ScrollView` interno (puede haber muchos participantes).

## 5. Preseleccion editionId / participantId y paso inicial (R5)

La carga inicial y la preseleccion se mantienen exactamente como hoy (dentro del `.then`
del `Promise.all`). Lo unico nuevo es fijar `currentStep` inicial en funcion de que
preseleccion llego y se resolvio, calculado en ese mismo `.then` (o en un `useEffect`
posterior a la carga):

- Sin parametros -> arranca en Step Edition (0). (R5.4)
- Con `editionId` valido y sin `participantId`: la edicion (paso 1) queda resuelta ->
  arranca en Step Activity (1). (R5.3)
- Con `participantId` valido (persona activa) y sin `editionId`: hay un participante ya
  anadido, pero la edicion (paso obligatorio previo) sigue sin elegir. Para no dejar al
  usuario en un paso posterior con un paso previo obligatorio vacio, arranca en Step
  Edition (0) con esa persona ya en `participantIds` (se vera reflejada al llegar al paso
  Participantes y en el Resumen). Cumple R5.2 ("arrancar con esa seleccion ya hecha") sin
  saltarse la eleccion obligatoria de edicion.
- Con `editionId` y `participantId` ambos validos: edicion resuelta y participante ya
  anadido -> arranca en Step Activity (1) (siguiente paso obligatorio sin resolver;
  participantes ya tiene contenido pero se puede revisar avanzando).

Regla general documentada (R5.3): **el asistente arranca en el primer paso obligatorio que
NO quede resuelto por la preseleccion**, empezando por Edicion. Como `participantId` por si
solo no resuelve el paso obligatorio Edicion, ese caso arranca en Edicion con el
participante ya marcado. Un `participantId` de persona inactiva/inexistente se ignora
(comportamiento actual) y no afecta al paso inicial.

## 6. Guard de permisos (sin cambios funcionales, R6.1)

Se conserva el `useEffect` que hace `router.replace('/')` si `!canWrite` y el
`if (!canWrite) return null;`. La garantia real es la RLS de escritura (ADR 0002/0005),
no este ocultado de UI. El wizard no cambia nada de esto.

## 7. Casos borde (R7)

- Error de carga inicial (R7.1): mismo `setError('No se han podido cargar los datos...')`;
  con `loading`/error el asistente no arranca (se muestra `LoadingState` o el error como
  hoy). Conviene que, si hubo error de carga, no se muestren pasos vacios.
- Deseleccionar participante con medalla (R7.2): ya lo cubre `toggleParticipant` actual
  (limpia las medallas de esa persona); al no tocar el handler, el paso Medallas y el
  Resumen quedan coherentes automaticamente.
- Ir Atras conserva selecciones (R7.3): garantizado por tener un unico estado de
  componente compartido entre pasos; navegar solo cambia `currentStep`, nunca resetea
  `selected*`/`participantIds`/`medals`.
- Guardado en curso (R7.4): el `Button` de guardar usa `loading={saving}` (deshabilita),
  como hoy.

## 8. Resumen (paso 6) - que se muestra

Bloque de solo lectura construido desde el estado actual (refleja cambios al volver, R4.3):

- Edicion: `editions.find(id === selectedEditionId)` -> ano (+ label si existe).
- Actividad: `selectedActivity?.name`.
- Participantes: nombres de `people` filtradas por `participantIds`.
- Medallas por color: para cada color, nombres de `people` en `medals[color]` (usando el
  mismo `accentColor` de `MEDALS` para coherencia visual); colores sin nadie se omiten o se
  muestran como "-".
- Detalles: `playedAt` y `notes` si no estan vacios.
- Cada bloque del resumen ofrece un modo de volver a corregir (p. ej. un enlace/boton
  "Editar" que hace `goToStep(paso correspondiente)`), cumpliendo R4.3. Alternativa minima:
  el boton "Atras" recorre pasos; pero se prefiere accesos directos por bloque.

## 9. Modelo de datos y servicios

Sin cambios de esquema ni de servicios. `createActivityResult`, `createActivity`,
`listEditions`/`listActivities`/`listPeople` se usan tal cual. No se toca RLS ni el modelo
de dominio (Edition/Person/Activity/ActivityResult/MedalAward, ver skill medallero-domain).

## 10. Tests

- App wizard (`src/__tests__/app/results/new.test.tsx`, ampliando el existente si lo hay):
  - Arranca mostrando un solo paso (Edicion) y el indicador "Paso 1 de 6".
  - No avanza sin edicion / actividad / participante / medalla, mostrando el mensaje exacto
    de cada caso (R3.1-R3.4); avanza tras corregir (R3.6).
  - Navegacion Siguiente/Atras conserva selecciones (R7.3).
  - Paso Resumen muestra edicion/actividad/participantes/medallas elegidos; volver y cambiar
    una seleccion se refleja en el resumen (R4.3).
  - Guardar en el Resumen invoca `createActivityResult` con el MISMO payload que hoy
    (mock del servicio) y hace `router.back()` (R4.2/R4.4); si el servicio rechaza,
    permanece en Resumen y muestra el error (R4.5).
  - Preseleccion: `editionId` -> arranca en Actividad con edicion fijada (R5.1/R5.3);
    `participantId` de persona activa -> arranca en Edicion con la persona ya en
    participantes (R5.2); sin params -> arranca en Edicion sin selecciones (R5.4).
  - Permisos: sin `canWrite` redirige (`router.replace('/')`), no renderiza el asistente
    (R6.1) — caso de permisos exigido por `conventions.md`.
- `npx tsc --noEmit` limpio y `npm test` en verde.
