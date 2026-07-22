# Histórico de progreso

## 2026-07-21 — f-020-edition-detail-tabs (done)

Rediseño de `/editions/[id]` (f-016) a petición del usuario ("la navegación se
divida en Clasificación —por puntos y por promedio— y Actividades"). Spec en
`specs/f-020-edition-detail-tabs/` (requirements EARS R1-R5, design, tasks, todo
marcado).

Decisiones de diseño clave (`design.md`): 2 pestañas con estado local `activeTab`,
mismo patrón ya entregado en `people/[id]/index.tsx` (addendum de f-018), sin
componente de tabs nuevo. **Clasificación**: reutiliza `EditionRankingList` tal
cual y añade el toggle "Por puntos"/"Por promedio" (`sortRanking`, `useMemo`, sin
refetch) que hasta ahora solo tenían el ranking histórico y el de actividad, no el
de edición. **Actividades**: función nueva `listEditionHistory(editionId)` en
`src/services/activityResults.ts`, paralela a `listActivityHistory` (f-007) pero
filtrando por `edition_id`; se extrajeron los helpers privados
`groupAwardsByResultId`/`resolveMedals` de la lógica ya escrita de
`listActivityHistory` para no duplicar la resolución de medallas/ganadores (su
comportamiento y tests quedaron intactos). Orden por `played_at` descendente con
nulos al final vía un comparador local nuevo (no se reutilizó
`compareByEditionRecency` a propósito, al ser una sola edición no hace falta
comparar por año). Cabecera, botón "Editar edición" y FAB quedan fuera de las
pestañas, sin duplicarse ni moverse.

Implementación (`implementer`): sin desviaciones respecto a `design.md`. Tests
nuevos en `src/__tests__/services/editionHistory.test.ts` y ampliación de
`src/__tests__/app/editions-id.test.tsx` (cambio de pestaña sin refetch, toggle
reordena en cliente, estados vacíos independientes por pestaña, FAB/editar
visibles en ambas).

Revisión (`reviewer`): **APTO PARA DONE, sin hallazgos bloqueantes**. Confirmó
cobertura EARS completa, que `listActivityHistory` produce exactamente el mismo
resultado tras la extracción de helpers (mismos tests en verde), que el
`.in('result_id', resultIds)` de `listEditionHistory` es seguro (máximo real ~92
resultados por edición en el histórico, verificado contra
`data/historico-medallas.json`, muy lejos del caso que obligó a usar
`.contains(...)` en f-017/f-018 para historiales de persona), que toggle/cambio de
pestaña no disparan red, gating `canWrite` sin cambios y sin escritura nueva, y que
no se tocó `rankings/editions/[id].tsx` (pantalla separada de f-005, fuera de
alcance). 2 hallazgos MENORES de estilo/DRY aceptados sin cambio: comparador de
"nulos al final" duplicado entre `compareByEditionRecency` y
`comparePlayedAtDescending`, e interfaces de fila de award casi idénticas entre
`listActivityHistory` y `listEditionHistory`. Ninguno justificó otra ronda.

Verificación de cierre: `npx tsc --noEmit` limpio; `npx jest` 36 suites / 243 tests
en verde. `feature_list.json` → `f-020-edition-detail-tabs` a `status: done`.
**Backlog agotado**: no quedan features en `backlog` ni `in-progress`.

## 2026-07-21 — f-019-results-wizard-flow (done)

Rediseño de `/results/new` (f-004) de formulario largo con scroll único a **asistente
por pasos**, a petición del usuario ("varios pasos, cada una de las acciones... que se
vea una app profesional"). Spec en `specs/f-019-results-wizard-flow/` (requirements
EARS R1-R7, design, tasks, todo marcado). Se ejecutó en paralelo a otra sesión que
cerró `f-018-person-performance-charts`; ambas sesiones se coordinaron de forma
aditiva sobre `feature_list.json`/`progress/current.md` sin pisarse archivos.

Decisiones de diseño clave (ver `design.md`): 6 pasos en un único componente/archivo
— Edición, Actividad, Participantes, Medallas (oro+plata+bronce juntas en un solo
paso, decisión explícita del usuario), Detalles, Resumen final editable. Todo el
estado y handlers de negocio existentes (`toggleParticipant`, `toggleMedal`,
`handleCreateActivity`, `handleSave`, `createActivityResult`) se conservan
intactos; solo se añade `currentStep` y se descompone la cascada de validación en
`validateStep(step)` (misma validación y mismos mensajes de error que antes, ahora
aplicada paso a paso en vez de solo al guardar). Indicador de progreso "Paso X de 6"
con `View`/`width %` (sin librería de charts ni SVG, mismo criterio que f-018).
Preselección `editionId`/`participantId` (f-016/f-017) decide el paso inicial: si
llega `editionId` resuelto arranca en Actividad; `participantId` de persona activa
se añade como participante y arranca en Edición (o Actividad si ambos params llegan
resueltos); persona inactiva vía `participantId` se ignora, igual que antes.

Implementación (`implementer`): reescritura de `src/app/results/new.tsx` con
`enum Step`, `ProgressIndicator`, `SummaryBlock` (con `onEdit` por bloque hacia
`goToStep`), `goNext`/`goBack`. Sin tocar `createActivityResult` ni RLS. Tests
reescritos completos en `src/__tests__/app/results/new.test.tsx` (19 tests
iniciales).

Revisión (`reviewer`): **sin hallazgos bloqueantes**. Confirmó equivalencia byte a
byte del payload guardado con el formulario anterior, los 6 pasos en orden, bloqueo
de "Siguiente" por paso con los mismos mensajes, resumen editable reflejando cambios,
preselección decidiendo el paso inicial según lo documentado, gating `canWrite` sin
cambios, sin código muerto relevante. 2 hallazgos MENORES de cobertura (test
reescrito sin cubrir "crear actividad nueva" R2.2 ni "deseleccionar participante
quita su medalla" R7.2, aunque el código correspondiente —heredado sin tocar— sí era
correcto) y una observación de mantenibilidad no bloqueante (validación duplicada
entre `validateStep` y `handleSave`, decisión consciente documentada en `design.md`).

Los 2 hallazgos menores se cerraron antes de marcar `done`: 3 tests nuevos añadidos
(creación de actividad con éxito, `ActivityNameTakenError`, deselección de
participante que limpia su medalla), sin tocar el código de la pantalla (el reviewer
ya lo había confirmado correcto). Verificación final: `npx tsc --noEmit` limpio;
`npx jest` 35 suites / 234 tests en verde, sin regresiones.

`feature_list.json` → `f-019-results-wizard-flow` a `status: done`. **Backlog
agotado**: no quedan features en `backlog` ni `in-progress` (f-018, cerrada en
paralelo por otra sesión, también quedó `done`).

Nota operativa de esta sesión: la API de Anthropic sufrió sobrecarga (529) durante
la creación de la spec de f-019, con varios reintentos fallidos antes de que el
`orchestrator` completara la tarea; se verificó en cada reintento que no había
quedado estado a medias (`feature_list.json` seguía en `backlog`, sin carpeta
`specs/f-019-*`) antes de reintentar, para no duplicar trabajo ni corromper el
backlog.

## 2026-07-21 — f-017-person-detail-view (done)

Vista de detalle de participante, simétrica a f-016: `/people/[id]` pasa de formulario
de edición a vista pública con resumen de medallas (oro/plata/bronce/total/
participaciones/promedio, agregando todas las ediciones) e histórico de pruebas en las
que participó (edición, actividad, medalla propia o "participó sin medalla"), más un
FAB (solo `canWrite` y persona activa) hacia `/results/new` con `participantId`
preseleccionado. El formulario de edición se movió a `/people/[id]/edit`. Spec en
`specs/f-017-person-detail-view/` (requirements EARS R1-R5, design, tasks, todo
marcado).

Implementación (`implementer`): servicios nuevos sin duplicar agregación —
`listPersonSummary(personId)` en `src/services/rankings.ts` (filtra
`listHistoricRanking`/`buildRanking`, `null` si la persona nunca jugó) y
`listPersonHistory(personId)` en `src/services/activityResults.ts` (paralelo a
`listActivityHistory`, filtra por `.contains('participant_ids', [id])`, resuelve la
medalla propia por prueba, comparador `compareByEditionRecency` compartido entre
ambas funciones). Carpeta `(tabs)/people/[id]/` con `index.tsx` (detalle) y `edit.tsx`
(formulario movido); `_layout.tsx` y `people/index.tsx` (navegación pública)
actualizados; `results/new.tsx` amplía la lectura de params con `participantId` sin
romper el `editionId` de f-016. Tests en `rankings.test.ts`, `personHistory.test.ts`
(nuevo), `people-id.test.tsx` (nuevo) y ampliación de `results/new.test.tsx`.

Revisión (`reviewer`): **1 hallazgo BLOQUEANTE** — el `implementer` dejó sin borrar
el archivo plano original `src/app/(tabs)/people/[id].tsx` (el formulario viejo) al
crear la carpeta `people/[id]/`, generando una colisión de rutas expo-router entre
`people/[id].tsx` y `people/[id]/index.tsx` (mismo patrón de bug ya documentado para
f-014 en memoria de proyecto: archivo plano + carpeta con el mismo segmento de ruta).
El orchestrator verificó la colisión (`ls` mostraba ambos), eliminó el archivo residual
y re-verificó `npx tsc --noEmit` limpio + `npx jest` 35 suites/211 tests en verde antes
de cerrar. Resto de la revisión sin hallazgos: cobertura EARS completa, gating
`canWrite`+persona activa correcto en ambas capas, sin RLS nueva, edge cases (sin
pruebas, id inexistente, persona inactiva, error recuperable) cubiertos y testeados,
`participantId` inactivo ignorado correctamente en `results/new.tsx`.

Nota para el futuro: al reestructurar una ruta plana `[id].tsx` en carpeta `[id]/`,
confirmar explícitamente el `rm`/eliminación del archivo plano antes de cerrar —
no basta con que `_layout.tsx` ya no lo declare.

Verificación de cierre: `npx tsc --noEmit` limpio; `npx jest` 35 suites / 211 tests en
verde. `feature_list.json` → `f-017-person-detail-view` a `status: done`. **Backlog
agotado**: no quedan features en `backlog` ni `in-progress`.

## 2026-07-21 — f-016-edition-detail-view (done)

Vista de detalle de edición: `/editions/[id]` pasa de formulario de metadatos a
vista pública con participantes + clasificación (reutilizando `listEditionRanking`
de f-005 vía nuevo componente compartido `src/components/rankings/EditionRankingList.tsx`,
también adoptado por `rankings/editions/[id].tsx`) y FAB propio (solo `canWrite`)
hacia `/results/new` con `editionId` preseleccionado. El formulario de metadatos se
movió a `/editions/[id]/edit`. Spec en `specs/f-016-edition-detail-view/`
(requirements EARS R1-R5, design, tasks, todo marcado).

Implementación (`implementer`): carpeta `(tabs)/editions/[id]/` con `index.tsx`
(detalle) y `edit.tsx` (formulario movido, guard `canWrite` redirige ahora al
detalle en vez de al listado); `_layout.tsx` actualizado a las rutas anidadas;
`editions/index.tsx` navega al detalle para cualquier visitante; `results/new.tsx`
lee el nuevo param `editionId` para preseleccionar edición sin romper el flujo sin
parámetro. Tests nuevos/actualizados en `editions-id.test.tsx`,
`editions/index.test.tsx`, `results/new.test.tsx`.

Revisión (`reviewer`): **APTO PARA DONE, sin hallazgos bloqueantes**. Confirmó
gating `canWrite` en ambas capas (UI + RLS ya existente, sin escritura nueva),
casos borde (edición vacía, id inexistente, error recuperable) cubiertos y
testeados, ninguna referencia rota a la ruta antigua, y el componente compartido
`EditionRankingList` sin duplicar ni romper lógica entre las dos pantallas que lo
consumen. 3 notas no bloqueantes (comportamiento de `Promise.all` no documentado
explícitamente pero correcto y cubierto por test; título estático "Edición" en vez
de dinámico por año; sin test unitario propio del componente extraído, coherente
con convenciones al ser puramente presentacional).

Verificación de cierre: `npx tsc --noEmit` limpio; `npx jest` 33 suites / 189 tests
en verde. `feature_list.json` → `f-016-edition-detail-view` a `status: done`.
**Backlog agotado**: no quedan features en `backlog` ni `in-progress`.

## 2026-07-21 — f-015-settings-tab (done)

Cuarta pestaña "Ajustes" (cuenta + tema) en la barra inferior de f-014. Spec en
`specs/f-015-settings-tab/` (requirements EARS R1-R5, design, tasks T1-T10). No
reimplementa el OAuth (f-011), el modo lectura publica (f-012) ni la logica de
`ThemeProvider`: reutiliza `useAuth` y `useTheme.setPreference` (que hasta ahora no
tenia ninguna UII). Sin migracion ni RLS nueva (feature puramente de navegacion/
presentacion; el reviewer confirmo sin acceso a datos nuevo).

Decisiones de diseno clave: (1) carpeta `(tabs)/settings/` con `_layout.tsx` (Stack,
`index` titulado "Ajustes") + `index.tsx`, mismo patron que las otras 3 pestañas;
(2) `AppTabBar` reparte 2/2 alrededor del FAB con reparto GENERALIZADO por punto medio
(`Math.ceil(len/2)`) en vez de los `slice(0,2)`/`slice(2,3)` con `index=2` fijo de
f-014, conservando el indice real de cada ruta para icono/focused/onPress y con helper
`renderTab(route,index)` para no duplicar el bloque de item; (3) se RETIRAN el modal
`/account` y `HeaderAccountButton` (recomendado por el usuario) porque su contenido de
cuenta/sesion pasa a la pestaña Ajustes — mantenerlos duplicaria la logica de sesion
(AC4). Orden de pestañas: Ediciones, Clasificaciones, (+), Participantes, Ajustes.

Implementacion (subagente `implementer`, T1-T10): nuevos
`src/app/(tabs)/settings/_layout.tsx` (Stack sin `headerRight`) y `settings/index.tsx`
(seccion Cuenta: autenticado -> email + "Cerrar sesion"/`signOut`, invitado ->
`<SignInPrompt />`, identico al antiguo `account.tsx`; seccion Tema: selector
Claro/Oscuro/Sistema con la opcion `preference` marcada, `onPress -> setPreference`,
accesible con `accessibilityState={{selected}}`, fuera del condicional de sesion para
que sea visible siempre). Modificados `(tabs)/_layout.tsx` (+`Tabs.Screen name="settings"`),
`AppTabBar.tsx` (TAB_CONFIG.settings + reparto 2/2 + `renderTab`), los 3 `_layout.tsx`
de pestaña (quitado import/`headerRight` de `HeaderAccountButton`), `src/app/_layout.tsx`
(quitado `Stack.Screen name="account"`, `AuthGate` intacto) y
`AppTabBar.test.tsx` (buildProps a 4 rutas + etiqueta "Ajustes"). Borrados
`src/app/account.tsx`, `src/components/navigation/HeaderAccountButton.tsx` y
`src/__tests__/app/account.test.tsx`. Test nuevo `src/__tests__/app/settings.test.tsx`
(cuenta autenticado/invitado + los 3 `setPreference` del selector + marcado de la opcion
activa).

Revision (subagente `reviewer`): **APTO PARA DONE, sin hallazgos bloqueantes**. Confirmo
R1-R5: 4ª pestaña registrada, reparto 2/2 generalizado sin indices fijos con indice real
conservado, FAB con su comportamiento/accesibilidad intactos, cuenta/sesion sin duplicar
logica, selector de tema con los 3 valores correctos y visible para invitado, `/account`
y `HeaderAccountButton` retirados sin referencias rotas (grep en `src/` solo halla un
comentario historico inocuo), `AuthGate` intacto, sin RLS nueva. 3 NITs no bloqueantes:
(1) `settings.test.tsx` "plano" en vez de espejar `app/(tabs)/settings/` — inconsistencia
heredada del repo (otros tests de pantalla ya son planos), no desviacion nueva; (2) el
test de `AppTabBar` no presiona una pestaña del lado derecho para blindar el calculo
`mid+index` (el codigo se reviso manualmente y es correcto); (3) los comentarios
`// R4.1`/`// R4.2` junto a `onPressFab` referencian numeracion de f-014, codigo
preexistente no tocado. Ninguno justifica otra ronda.

Nota sobre la memoria `project_f014_route_collision.md`: quedaba OBSOLETA (era de cuando
f-014 estaba en vuelo con rutas planas duplicadas). f-014 cerro eliminando las rutas
planas — solo existen ya bajo `(tabs)` — y `AppTabBar` existe; añadir `(tabs)/settings/`
no reintroduce colision (`/settings` no tiene equivalente plano). No fue bloqueante.

Verificacion de cierre: `npx tsc --noEmit` limpio; `npm test` (`npx jest`) 32 suites /
175 tests, todos en verde, sin regresiones (`account.test.tsx` eliminado, `settings.test.tsx`
y la ampliacion de `AppTabBar.test.tsx` en verde). `feature_list.json` ->
`f-015-settings-tab` a `status: done`, `spec_path` fijado. **Backlog agotado**: no quedan
features en `backlog` ni `in-progress`. Pendiente del usuario (heredado de f-011, sin
cambios): configurar Google en Supabase Auth y el redirect deep link para el OAuth real.

## 2026-07-20 - f-014-bottom-tabs-navigation (done)

Navegacion principal por pestanas inferiores con FAB central de registro rapido.
Spec en `specs/f-014-bottom-tabs-navigation/` (requirements EARS R1-R7, design,
tasks T1-T12). Solo reorganiza la navegacion; no reimplementa listados/rankings/
registro (f-001/f-002/f-004/f-005/f-006/f-007) ni toca RLS.

Decision de diseno clave: grupo de rutas `(tabs)` de expo-router anidado dentro del
`Stack` raiz, aprovechando que los grupos con parentesis NO contribuyen a la URL — al
mover `editions/index.tsx` a `(tabs)/editions/index.tsx` la URL sigue siendo
`/editions`, asi que CERO llamadas `router.push/replace` existentes se rompen (R5.4).
Cada pestana es un `Stack` anidado propio para que los detalles/edicion naveguen
"dentro de la pestana" con la barra visible (R5.1). El `AuthGate` de `_layout.tsx` NO
se toca (su logica de `claim-person`/`welcome`/`sign-in` sigue intacta; las rutas de
pestana tienen `segments[0]==='(tabs)'`, que no colisiona con ninguna regla).
`index.tsx` pasa a `<Redirect href="/editions" />` para conservar `/` como destino de
los `router.replace('/')` existentes. Se evitan dos regresiones al eliminar el home:
(R6) el signOut/SignInPrompt se reubican en un modal `/account` alcanzable desde el
`headerRight` de las 3 pestanas; (R7) el catalogo de actividades (`/activities`,
sigue en la raiz) se enlaza desde el hub de Clasificaciones.

Implementacion (subagente `implementer`): `(tabs)/_layout.tsx` (`Tabs` con `tabBar`
personalizado y `headerShown:false`); barra `src/components/navigation/AppTabBar.tsx`
con 3 items (iconos Ionicons calendar/podium/people, activo `colors.primary`,
inactivo `textTertiary`, fondo `surface`, borde `border`, `paddingBottom=insets.bottom`)
y FAB central circular elevado (LinearGradient `gradientFrom->gradientTo`,
`translateY:-18`, sombra, icono `add`, `accessibilityLabel="Registrar resultado"`) que
va a `/results/new` si `canWrite` y a `/sign-in` si no (R4; `/welcome` rebotaria por
`guestChosen`); hub nuevo `(tabs)/rankings/index.tsx` (3 NavCards a los rankings
existentes + "Catalogo de actividades"); `_layout.tsx` de cada pestana con los titulos
de header actuales + `HeaderAccountButton`; `account.tsx` (email+Cerrar sesion / o
SignInPrompt). Movidas con `mv` (no `git mv`: `src/app` estaba sin trackear) todas las
pantallas de editions/people/rankings a `(tabs)/...` sin editar su contenido.
Actualizados los imports de los tests de pantallas movidas; borrado
`src/__tests__/app/index.test.tsx` (el home deja de ser pantalla de contenido, con lo
que sus 4 fallos preexistentes por `SafeAreaProvider` desaparecen). Tests nuevos:
`AppTabBar.test.tsx` (FAB canWrite->/results/new y !canWrite->/sign-in con ambas ramas,
3 etiquetas), `rankings-hub.test.tsx` y `account.test.tsx`.

Revision (subagente `reviewer`): **APTO PARA DONE, sin hallazgos bloqueantes ni no
bloqueantes**. Confirmo R1-R7 (barra+FAB con safe-area, gating del FAB en ambas ramas
con test, hub publico sin duplicar logica, stacks anidados + modales `presentation:
'modal'` conservados, `AuthGate` identico al original, ninguna URL rota, acceso a
sesion/cuenta preservado, catalogo enlazado, sin cambios de RLS). Valido las dos
desviaciones declaradas: (a) `mv` en vez de `git mv` (src/app sin trackear) sin
residuales en las ubicaciones antiguas; (b) `import type { BottomTabBarProps }` desde
`expo-router/js-tabs` (el entry principal de expo-router SDK 57 solo reexporta el `Tabs`
deprecado, no el tipo; es import type -> riesgo de runtime nulo). Unica NIT:
vigilar ese subpath `expo-router/js-tabs` en futuras actualizaciones de expo-router.

Verificacion de cierre: `npx tsc --noEmit` limpio; `npm test` 32 suites / 171 tests
todos en verde, sin regresiones. `feature_list.json` -> `f-014-bottom-tabs-navigation`
a `status: done`, `spec_path` fijado. **Backlog agotado**: no quedan features en
`backlog` ni `in-progress`.

## 2026-07-19 — Bootstrap del harness

Se reutiliza el harness de ViajaPayá (agentes `orchestrator`/`implementer`/`reviewer`/`explorer`, comandos `/feature:*` y `/progress:update`, hooks, flujo `feature_list.json` → `specs/` → `progress/`) para arrancar MedalleroSanPedro.

Se analizó `historico-medallas.xlsx` (2009-2025) para derivar el modelo de dominio: `Edition`, `Person`, `Profile`, `Activity`, `ActivityResult`, `MedalAward` (ver `docs/domain-model.md` y ADRs 0001-0004). Se definió el backlog inicial en `feature_list.json` (12 features, todas en `backlog`), cubriendo bootstrap, Supabase, auth Google SSO con reclamación de persona y roles admin/member, modo público de solo lectura, gestión de personas/ediciones/actividades, registro de resultados/medallas, tres vistas de ranking (edición/histórico/actividad), e importación del histórico.

Ningún código de aplicación implementado todavía. Ninguna feature `in-progress`.

## 2026-07-19 — Registro de proyectos EAS y Supabase

El usuario registró los proyectos externos (Claude no puede crear cuentas/proyectos): EAS (`medallerosanpedro`, owner `payarroni`, project ID `19176f10-94cd-4746-abc3-171ef40e2218`) y Supabase (`MedalleroSanPedro`, ref `oqowldchsqlvddumwbap`, región `eu-west-1`). Documentado en `docs/tech-stack.md`. Sigue pendiente rellenar `.env.local` con URL/anon key y configurar el proveedor Google en Supabase Auth. Ninguna feature `in-progress` todavía.

## 2026-07-19 — f-000-project-bootstrap (done)

Arrancado el proyecto Expo real dentro de `src/`. Spec creada en
`specs/f-000-project-bootstrap/` (requirements EARS, design, tasks 12/12). Implementado
por el subagente `implementer`: Expo SDK 57 (RN 0.86, React 19.2), Expo Router con raíz
de rutas en `src/app` (sin `app/` en la raíz), TypeScript estricto, alias `@/*` → `src/*`
resuelto en tsconfig, Jest (`moduleNameMapper`) y runtime (Metro). Testing con `jest-expo`
57 + RNTL 14 (render asíncrono), dos tests de ejemplo verdes. `app.json` con la identidad
EAS (slug `medallerosanpedro`, owner `payarroni`, projectId `19176f10-...`). Estructura de
`src/` conforme a `docs/architecture.md` (placeholders `.gitkeep`). `docs/tech-stack.md`
actualizado con versiones reales. Verificado: `npm test` 4/4 PASS, `npx tsc --noEmit`
limpio, `expo-doctor` 20/20, `expo export` (web/android) bundlea sin errores. Revisado por
`reviewer` contra `requirements.md`/`conventions.md`: veredicto APTO PARA DONE, sin
bloqueantes (notas no bloqueantes: alias runtime sin config Metro/Babel explícita pero
funcional; `data/historico-medallas.*` huérfano documentalmente; pendiente commit del
árbol untracked). Sin Supabase (f-010) ni auth (f-011). Siguiente feature: `f-010-supabase-setup`.

## 2026-07-19 — Eliminación del rol admin

A petición del usuario, se elimina el rol `admin`: a partir de ahora cualquier usuario autenticado con su `Person` ya reclamada puede editar (personas, ediciones, actividades, resultados y medallas) — solo quedan dos niveles, anónimo (solo lectura) y autenticado con persona reclamada (lectura + escritura). Documentado en el ADR nuevo `docs/decisions/0005-remove-admin-role.md` (que sustituye la sección "Roles" del ADR 0002, conservado como registro histórico) y propagado a `docs/domain-model.md`, `docs/decisions/0003-public-readonly-access.md`, `docs/conventions.md`, `docs/architecture.md`, `CLAUDE.md`, `.claude/agents/reviewer.md`, `.claude/skills/medallero-domain/SKILL.md`, `.claude/skills/spec-workflow/SKILL.md` y las acceptance_criteria de `feature_list.json` (f-001, f-002, f-003, f-004, f-011, f-012). Ninguna de esas features había arrancado todavía (todas seguían en `backlog`), así que no hay código ni specs que migrar.

## 2026-07-19 — f-010-supabase-setup (done)

Integración de Supabase: cliente + esquema de BBDD con RLS. Spec creada en `specs/f-010-supabase-setup/` (requirements EARS, design, tasks 12/12). Implementado por el subagente `implementer`: `src/services/supabase.ts` (cliente singleton que lee solo `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`, sin credenciales literales, error claro si faltan), tipos de dominio en `src/types/domain.ts` (Edition/Person/Profile/Activity/ActivityResult/MedalAward + tipo `Medal` = gold/silver/bronze), y la migración `supabase/migrations/20260719120000_init_schema.sql` con las seis tablas, enum `medal`, constraints (uniques `editions.year`/`people.claimed_by_user_id`/`profiles.person_id`, FKs, `unique(result_id, medal)`, `pgcrypto`), helper `public.has_claimed_person()` y RLS activo en las seis tablas (SELECT público en editions/people/activities/activity_results/medal_awards; `profiles` solo dueño; escritura solo autenticado con `person_id` no nulo; nada de escritura para `anon`). Añadido `@supabase/supabase-js@2.110.7` a `package.json`; `docs/tech-stack.md` actualizado; `supabase/README.md` con los pasos manuales del usuario. Sin `role` (ADR 0005); sin trigger de Profile ni RPC de reclamar Person (delegado a f-011); invariantes ganador ⊆ participantes delegadas a f-004. Verificado: `npm test` 7/7 PASS, `npx tsc --noEmit` limpio. Revisado por `reviewer` contra `requirements.md`/`conventions.md`: veredicto APTO PARA DONE, sin bloqueantes. Nota no bloqueante para f-011: la política `profiles_write_own` permite hoy `UPDATE profiles SET person_id` directo (sin pasar por RPC atómica que también fije `people.claimed_by_user_id`); f-011 debe restringirla/reemplazarla al implementar el flujo de reclamación (ADR 0002). La dependencia f-000 quedó `done` durante esta sesión.

Pendiente del usuario (no lo hace el agente): crear/usar el proyecto Supabase real (ref `oqowldchsqlvddumwbap`), rellenar `.env.local` con `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`, aplicar las migraciones y verificar la lectura anónima (rol `anon`). Siguiente feature: `f-011-auth-google-sso`.

## 2026-07-19 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-19 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-19 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-19 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-19 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-19 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-19 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — f-011-auth-google-sso (done)

Login exclusivo con Google (Supabase Auth) y reclamación obligatoria de `Person`. Spec en
`specs/f-011-auth-google-sso/` (requirements EARS, design, tasks 15/15). La implementación
la había dejado hecha una sesión anterior interrumpida, que además había marcado la feature
`done` en `feature_list.json` **sin** haber pasado por `reviewer` ni verificado tests
(inconsistente con `current.md`, que seguía en `in-progress`, y con `docs/conventions.md`).
Esta sesión trató ese `done` como falso positivo: se revirtió a `in-progress`, se ejecutaron
`npm test` (29/29 PASS) y `npx tsc --noEmit` (limpio) y se lanzó `reviewer` contra
`requirements.md`.

Implementación (subagente `implementer`): flujo OAuth Google PKCE nativo en
`src/services/auth.ts` con `makeRedirectUri({ scheme: 'medallerosanpedro' })` +
`WebBrowser.openAuthSessionAsync` + `exchangeCodeForSession` (arregla el bug del usuario: el
redirect por defecto de Supabase mandaba a `localhost:3000`/404 en móvil; ahora vuelve al
deep link `medallerosanpedro://`); cliente Supabase con sesión persistida en AsyncStorage
(PKCE, `detectSessionInUrl:false`, url-polyfill); `AuthContext`
(`session/profile/loading/isAuthenticated/hasClaimedPerson/canWrite`); pantallas `sign-in`
(único botón Google), `claim-person` (lista de no reclamadas, salida solo por logout) y
`AuthGate` que fuerza el onboarding mientras `personId` sea nulo; servicios
`profiles.ts`/`people.ts`. Migración `supabase/migrations/20260719130000_auth_claim_person.sql`:
trigger `handle_new_user` (auto-Profile), RPC atómica `claim_person` `SECURITY DEFINER` (fija
`profiles.person_id` y `people.claimed_by_user_id` a la vez, `UPDATE ... WHERE
claimed_by_user_id IS NULL` a prueba de carreras, error `23505` -> `PersonAlreadyClaimedError`),
eliminación de `profiles_write_own` (cierre del hueco heredado de f-010) y trigger
`protect_person_claim`.

Revisión (`reviewer`): 1 hallazgo BLOQUEANTE — `protect_person_claim` solo cubría
`BEFORE UPDATE`, dejando una vía de `INSERT` directo en `people` (política f-010
`people_write_claimed_person` es `for all`) para fijar `claimed_by_user_id` saltándose la RPC
(violación de R4.4). Corregido: trigger ampliado a `BEFORE INSERT OR UPDATE` distinguiendo
`tg_op` (INSERT bloquea `claimed_by_user_id` no nulo fuera del flag `app.claiming`; INSERT con
NULL —alta normal de f-001— pasa), README de verificación manual ampliado con el escenario
INSERT, y nota de desviación en `design.md`. Re-revisión focalizada del fix: BLOQUEANTE
CERRADO, APTO PARA DONE. `npm test` 29/29 PASS y `npx tsc --noEmit` limpio tras el fix.

Pendiente del usuario (no lo hace el agente): (1) configurar el proveedor Google en Supabase
Auth (Client ID/Secret de Google Cloud) y **añadir el deep link `medallerosanpedro://redirect`
en Authentication -> URL Configuration -> Redirect URLs** —esto es lo que arregla
definitivamente el bug del redirect a `localhost:3000`—; (2) confirmar que solo Google está
habilitado como proveedor; (3) aplicar la migración `20260719130000_auth_claim_person.sql`;
(4) rellenar `EXPO_PUBLIC_SUPABASE_ANON_KEY` en `.env.local` si aún estuviera vacía; (5)
verificación manual de RLS/reclamación documentada en `supabase/README.md` (usuario sin persona
no escribe; INSERT directo de `claimed_by_user_id` bloqueado; carrera de reclamación deja una
sola ganadora). Siguiente feature: `f-012-public-readonly-mode`.

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — f-012-public-readonly-mode (done)

Modo público de solo lectura. Spec creada en `specs/f-012-public-readonly-mode/`
(requirements EARS R1/R2/R3, design, tasks 9/9). Feature transversal que se apoya en lo ya
construido: RLS de f-010 (SELECT público `anon` sobre editions/people/activities/
activity_results/medal_awards, escritura solo `authenticated` con `has_claimed_person()`) y
f-011 (`AuthGate` que no fuerza login sin sesión + señal `useAuth().canWrite`). No hay
migración nueva (verificado que no hay hueco de RLS) ni servicios nuevos.

Implementación (subagente `implementer`): dos primitivas reutilizables para que f-001..f-008
apliquen el gating de forma uniforme — `src/components/WriteGate.tsx` (muestra sus hijos solo
si `canWrite`; `fallback` opcional; documentado como defensa en profundidad, no sustituto de
RLS) y `src/components/SignInPrompt.tsx` (CTA "Iniciar sesión con Google" -> `/sign-in`,
punto de entrada del modo público). Integrado en `src/app/index.tsx` (la rama anónima usa
`<SignInPrompt />`; la rama autenticada conserva "Tu cuenta"/"Cerrar sesión"). Tests nuevos:
`WriteGate.test.tsx` (3 estados + fallback), `SignInPrompt.test.tsx` (CTA + navegación) y
ampliación de `index.test.tsx` (home anónimo sin controles de escritura). `AuthGate`
confirmado sin cambios de comportamiento.

Revisión (`reviewer`): APTO PARA DONE, sin hallazgos bloqueantes. `npm test` 36/36 PASS; el
código propio de f-012 pasa `tsc` en aislamiento. No bloqueantes: un test de `WriteGate` con
nombre engañoso (anónimo vs autenticado-sin-Person son indistinguibles a nivel de `WriteGate`
porque solo recibe `canWrite`; la distinción real ya está cubierta en el test de
`AuthContext` de f-011) e inconsistencia estética de comillas dobles/simples en los tests
nuevos (sin regla de lint que lo fuerce). Ninguno se consideró que justificara otra ronda.

Nota de concurrencia: `f-001-people-management` estuvo `in-progress` en paralelo (otra sesión)
y aterrizó código en `src/app/people/*` y un botón "Ver personas" en `src/app/index.tsx`.
`npx tsc --noEmit` a nivel de repo muestra 4 errores de tipo AJENOS a f-012, todos en esas
rutas de f-001 (tipos de ruta autogenerados de expo-router `.expo/types/router.d.ts` que aún
no reconocen `"/people"`); se resuelven al terminar/regenerar f-001 y no se tocaron desde
f-012 para no colisionar. Siguiente feature sugerida por prioridad/dependencias:
`f-002-editions-management` (must, depende solo de f-011).

## 2026-07-20 — f-001-people-management (done)

Gestión del roster de personas (`Person`): alta, edición de nombre y baja lógica
(`active = false`) preservando el histórico. Spec en `specs/f-001-people-management/`
(requirements EARS R1–R5, design, tasks completas). Feature apoyada íntegramente en
infraestructura existente: **sin migración SQL ni política RLS nueva** — reutiliza
`people_select_public` (lectura pública), `people_write_claimed_person` (escritura solo
autenticado con `Person` reclamada, `has_claimed_person()`) de f-010 y el trigger
`protect_person_claim` de f-011.

Implementación (subagente `implementer`): servicios `listPeople`/`createPerson`/
`updatePerson` añadidos a `src/services/people.ts` (ninguno envía `claimed_by_user_id`,
lo que mantiene compatible el `UPDATE` con el trigger de protección de la reclamación);
pantallas `src/app/people/index.tsx` (listado público de activas+inactivas, `Badge`
"Inactiva", controles de escritura gateados por `canWrite`), `people/new.tsx` (alta con
validación de nombre no-vacío y guarda de redirect si `!canWrite`) y `people/[id].tsx`
(renombrar + alternar `active` con copy de "no borra el histórico", misma guarda). Rutas
registradas en `_layout.tsx`; acceso "Ver personas" añadido a la Home. Baja lógica, sin
borrado físico (no hay `.delete()`). Nota de verificación manual de RLS de `people`
añadida a `supabase/README.md`.

Revisión (`reviewer`): APTO PARA DONE, sin hallazgos bloqueantes — confirmó que ningún
servicio/pantalla envía `claimed_by_user_id`, que las guardas de escritura son redirect
real (no solo ocultado de botón) y que no se añadió RLS nueva (coherente con R5). Hallazgos
MENOR/NOTA: faltaban tests de la guarda de escritura y validación de `new.tsx`, del badge
"Inactiva", y `WriteGate`/`SignInPrompt` (de f-012) no se reutilizaron en las pantallas.
Se cerró el hueco de tests (nuevo `src/__tests__/app/people/new.test.tsx` para guarda +
validación, y casos de badge en `index.test.tsx`); las NOTAs de estilo (`WriteGate` no
adoptado, variante visual del botón) se dejaron para features posteriores.

Verificación: `npm test` 61/61 PASS (12 suites). El código propio de f-001 pasa `tsc`
limpio; `npx tsc --noEmit` a nivel de repo muestra 3 errores AJENOS a f-001, todos por el
literal de ruta `"/editions/index"` (`src/app/editions/*` y el botón "Ver ediciones" de
`src/app/index.tsx`), trabajo en curso de `f-002-editions-management` en otra sesión cuyas
rutas aún no están registradas en `_layout`; se resolverán al terminar/registrar esa
feature. Siguiente feature sugerida por prioridad/dependencias: `f-002-editions-management`
(must, depende solo de f-011) o `f-003-activities-catalog`.

## 2026-07-20 — f-002-editions-management (done)

CRUD de ediciones del medallero (`Edition`: `year` único, `label`/`startDate`/`endDate`
opcionales). Spec creada en `specs/f-002-editions-management/` (requirements EARS R1–R4,
design, tasks 10/10 + item de traza de tests post-revisión). Feature apoyada íntegramente en
infraestructura existente: **sin migración SQL ni política RLS nueva** — la tabla
`public.editions` y sus políticas (`editions_select_public` lectura pública `anon`,
`editions_write_claimed_person` escritura solo autenticado con `Person` reclamada vía
`has_claimed_person()`) ya existían desde f-010. Reutiliza el gating de UI `useAuth().canWrite`
de f-011/f-012.

Implementación (subagente `implementer`, espejando el patrón de f-001-people-management):
servicio `src/services/editions.ts` (`listEditions` con `.order('year', { ascending: false })`
R3.1; `createEdition`/`updateEdition` que normalizan `label`/fechas vacías a `null` R1.4 y
traducen la violación de unicidad Postgres `23505` a `EditionYearTakenError` R1.2/R2.2);
pantallas `src/app/editions/index.tsx` (listado público con recarga al enfocar, `EmptyState`,
controles de escritura gateados por `canWrite`), `editions/new.tsx` (alta con validación de año
entero R1.3 y de rango de fechas fin ≥ inicio R1.5, guarda de redirect si `!canWrite` R4.3) y
`editions/[id].tsx` (edición con la misma guarda). Rutas registradas en `_layout.tsx`; tarjeta
de acceso "Ediciones" añadida a la Home. Sin borrado (fuera de alcance, no es criterio de
aceptación).

Revisión (subagente `reviewer`): **APTO PARA DONE, sin hallazgos bloqueantes** — confirmó la
traducción de `23505`, la validación en pantalla, el orden year desc, las guardas de escritura
como redirect real (no solo ocultado de botón), que la garantía real es la RLS de f-010 sin
cambios, y que no se tocó ningún archivo de f-001. Hallazgos NO bloqueantes: (1) `editions/[id]`
guarda los 4 campos juntos (last-writer-wins) en vez de solo el cambiado —decisión razonable al
ser formulario único—; (2) faltaban tests de pantalla del gating por paridad con f-001; (3) sin
validación de formato de fecha `YYYY-MM-DD` más allá del placeholder. Se cerró el punto (2)
antes de marcar `done`: añadidos `src/__tests__/app/editions/index.test.tsx` y
`editions/new.test.tsx` (gating `canWrite` y validación de año); no se hallaron bugs de app.
Puntos (1) y (3) se dejan como notas para features posteriores.

Verificación: `npm test` 68/68 PASS (14 suites); `npm run typecheck` (`tsc --noEmit`) limpio
(los errores residuales de ruta que veían f-001/f-012 durante la concurrencia quedan resueltos
al estar ya registradas las rutas `editions/*` en `_layout`). Nota de concurrencia:
`f-001-people-management` se cerró (`done`) en su propia sesión paralela durante esta feature;
no hubo colisión de archivos (people vs editions). Pendiente del usuario (heredado de f-010, no
lo hace el agente): verificación manual contra el Supabase real de que `anon`/autenticado sin
`Person` no puede escribir en `editions` (documentada en `supabase/README.md`). Siguiente
feature sugerida por prioridad/dependencias: `f-003-activities-catalog` (must, depende solo de
f-011); con f-002+f-003 hechas se desbloquea `f-004-medal-results-registration`.

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — f-003-activities-catalog (done)

Catálogo de actividades (`Activity`): alta, renombrado, lectura pública y buscador
para reutilizar una actividad existente en vez de duplicar. Spec en
`specs/f-003-activities-catalog/` (requirements EARS R1–R5, design con sección de
desviaciones, tasks 12/12). La implementación ya existía en disco: una sesión
anterior interrumpida la dejó completa y verificada, con todo `tasks.md` marcado,
pero **nunca pasó por `reviewer` ni cierre formal** (quedó `in-progress` en
`feature_list.json`). El orchestrator de esta sesión NO re-implementó (no había
nada pendiente en `tasks.md`, habría sido churn): delegó únicamente en `reviewer`.

Implementación (heredada, patrón espejo de f-001/f-002): migración
`supabase/migrations/20260720190000_activities_unique_name.sql` con índice único
case-insensitive `activities_name_lower_key on public.activities (lower(name))`
—red anti-duplicado que es el propósito central de la feature—; servicio
`src/services/activities.ts` (`listActivities` ordenado por nombre, `searchActivities`
con `ilike` como primitivo reutilizable para f-004, `createActivity`/`updateActivity`
con `trim` y traducción del código Postgres `23505` a `ActivityNameTakenError`);
pantallas `src/app/activities/index.tsx` (catálogo público + buscador con filtrado
en cliente, controles de escritura gateados por `canWrite`), `activities/new.tsx`
(alta con validación no-vacío, coincidencias en vivo para reutilizar, manejo de
`ActivityNameTakenError` y error genérico, guarda de redirect si `!canWrite`) y
`activities/[id].tsx` (renombrado con la misma guarda). Rutas añadidas de forma
aditiva a `_layout.tsx`; tarjeta "Actividades" reactivada en la Home (desviación
documentada: se movió el `NavCard` placeholder de "PRÓXIMAMENTE" a "EXPLORAR" en
vez de crear una tarjeta duplicada). Sin borrado físico (fuera de alcance;
`activity_results.activity_id` con `on delete restrict`).

Revisión (`reviewer`): **APTO PARA DONE, sin hallazgos bloqueantes**. Confirmó el
anti-duplicado case-insensitive (índice único + `23505` → `ActivityNameTakenError`
en create y update, con tests), la búsqueda `ilike`/filtrado, y el gating de
escritura en **ambas capas**: UI (`canWrite = isAuthenticated && hasClaimedPerson`
oculta "Añadir actividad" y desactiva filas; `new.tsx`/`[id].tsx` redirigen de
verdad con `router.replace` y devuelven `null` mientras `!canWrite`, no es solo
ocultar un botón) y RLS (`activities_write_claimed_person` de f-010 `for all to
authenticated` con `has_claimed_person()`, sin escritura para `anon`; la migración
de f-003 no toca RLS). `supabase/README.md` documenta la verificación manual de
escritura y del índice único. Hallazgos MENOR no bloqueantes y **no introducidos
por f-003** (sin test de `activities/[id].tsx`, mismo patrón ya aceptado en
`people/[id].tsx`/`editions/[id].tsx`; `WriteGate` de f-012 sin adoptar en ninguna
pantalla); NOTAs (sin escape de `%`/`_` en `searchActivities`, índice sobre
`lower(name)` no `lower(trim(name))`) documentadas y aceptadas en `design.md`.

Verificación: `npm.cmd run typecheck` limpio; `npm.cmd test -- --runInBand` 19
suites / 99 tests PASS (incluye los tres suites de `activities`). `feature_list.json`
→ `f-003-activities-catalog` a `status: done`. Nota de concurrencia: sesiones
paralelas cerraron f-004 y estaban en f-005-edition-ranking (in-progress) durante
este cierre; `current.md` se editó con cuidado de no pisar ese trabajo en curso.
Con f-002 + f-003 + f-004 hechas, la cadena de rankings (f-005/f-006/f-007) y la
importación del histórico (f-008) quedan desbloqueadas.

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 - f-004-medal-results-registration (done)

Registro de resultados y medallas de una prueba. Spec en `specs/f-004-medal-results-registration/` (requirements/design/tasks 8/8). Implementado `src/services/activityResults.ts` con validacion local y RPC atomica `create_activity_result_with_awards`; pantalla `src/app/results/new.tsx` para elegir edicion, actividad existente o nueva, participantes, medallas por color, fecha y notas. Rutas y entrada de Home registradas; escritura visible solo con `canWrite`; garantia real por RLS de `activity_results`/`medal_awards`.

Verificacion de cierre: `npm.cmd run typecheck` limpio; `npm.cmd test -- --runInBand` PASS (21 suites, 104 tests). Marcado `done` en `feature_list.json` con `spec_path` actualizado.

## 2026-07-20 - f-005-edition-ranking (done)

Clasificacion de una edicion. Spec en `specs/f-005-edition-ranking/` (requirements/design/tasks 8/8). Implementado `src/services/rankings.ts`: agrega `people`, `activity_results` y `medal_awards` sin almacenar rankings, cuenta participaciones desde `participantIds`, medallas por persona y promedio medallas/participacion; ordena por oro, plata, bronce, total, promedio y nombre. Pantallas publicas `src/app/rankings/editions/index.tsx` y `src/app/rankings/editions/[id].tsx`, con entrada publica en Home.

Verificacion de cierre: `npm.cmd run typecheck` limpio; `npm.cmd test -- --runInBand` PASS (21 suites, 104 tests). Marcado `done` en `feature_list.json` con `spec_path` actualizado.

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 - f-006-historic-ranking (done)

Clasificacion historica agregada de todas las ediciones (equivalente a la hoja
RESULTADOS del xlsx) con un ranking alternativo por promedio de medallas por
participacion. Spec en `specs/f-006-historic-ranking/` (requirements EARS R1-R3,
design, tasks 9/9). Vista de solo lectura, accesible sin sesion: sin migracion ni
RLS nueva (se apoya en la lectura publica `anon` de people/activity_results/
medal_awards de f-010).

Implementacion (subagente `implementer`, generalizando el patron de f-005): en
`src/services/rankings.ts` se extrajo el helper interno `buildRanking`
(participaciones desde `participant_ids`, medallas desde `person_ids`, promedio
`total/participaciones`) reutilizado por `listEditionRanking` (f-005, intacto) y la
nueva `listHistoricRanking` (agrega TODAS las ediciones, `activity_results` sin
filtro `edition_id`). Tipo base `RankingRow` con `EditionRankingRow`/
`HistoricRankingRow` como alias; comparadores `compareByMedals` (oro, plata,
bronce, total, promedio, nombre) y `compareByAverage` (promedio, total, oro,
plata, bronce, nombre) y `sortHistoricRanking(rows, mode)` exportado. Pantalla
publica nueva `src/app/rankings/historic.tsx` con `useFocusEffect`, toggle "Por
medallas"/"Por promedio" que reordena en cliente via `useMemo` + `sortHistoricRanking`
SIN re-consultar el backend (R3.1), misma presentacion de fila que f-005 y
`EmptyState`. Ruta `rankings/historic` registrada en `_layout.tsx`; NavCard publica
"Clasificacion historica" anadida a EXPLORAR en la Home y el placeholder de
"PROXIMAMENTE" reenfocado a "Clasificacion por actividad" (f-007). Tests: ampliado
`src/__tests__/services/rankings.test.ts` (agregacion multi-edicion, participacion
sin medalla, sin resultados no consulta medal_awards, reordenado por promedio sin
mutacion) sin tocar las aserciones heredadas de f-005, y nuevo
`src/__tests__/app/rankings-historic.test.tsx` (desglose/total/participaciones/
promedio, ausencia de controles de escritura, toggle con `toHaveBeenCalledTimes(1)`,
estado vacio).

Revision (subagente `reviewer`): **APTO PARA DONE, sin hallazgos bloqueantes**.
Confirmo agregacion de todas las ediciones sin filtro, desempates de ambos ordenes,
reordenado en cliente sin re-fetch (test con `toHaveBeenCalledTimes(1)`), acceso
publico sin ningun control de escritura, ausencia de migracion/RLS nueva (correcto
al no escribir nada) y tests de f-005 intactos y verdes. Hallazgos no bloqueantes:
(MENOR) "Clasificacion historica" y "Registrar resultado" comparten icono
`trophy-outline` en la Home (cosmetico); (NOTA) sin umbral minimo de participaciones
para el ranking por promedio (decision diferida ya documentada en `design.md`, no es
criterio de aceptacion); (NOTA) `index.test.tsx` no asegura explicitamente la nueva
NavCard (pantalla presentacional, testeo opcional por convenciones). Ninguno
justifica otra ronda.

Verificacion: `npm.cmd run typecheck` limpio; `npm.cmd test -- --runInBand` 22 suites
/ 114 tests PASS. `feature_list.json` -> `f-006-historic-ranking` a `status: done`.
Siguiente feature sugerida por prioridad/dependencias: `f-007-activity-ranking`
(should, depende de f-004) o `f-008-historical-data-import` (should).

## 2026-07-21 - f-008-historical-data-import (done)

Importacion puntual (one-off) del historico `data/historico-medallas.json`
(derivado de `historico-medallas.xlsx`, 2009-2025) a las tablas de dominio de
Supabase. Spec creada en `specs/f-008-historical-data-import/` (requirements
EARS R1-R9, design, tasks 10/10). Datos de origen verificados directamente por
el orchestrator: 21 personas, 17 ediciones (2009-2025), 996 activityResults (995
pruebas reales + 1 artefacto `2021-054 "MEDALLERO"` con 0 participantes que se
omite), 494 nombres de actividad crudos distintos, medallas gold/silver/bronze/
null, sin personId desconocidos ni participantes duplicados.

Decisiones de diseno clave: (1) NO es una pantalla de la app, es un script Node/
TS en `src/scripts/historico/`; (2) NO reutiliza `src/services/*` porque
`src/services/supabase.ts` es el cliente React Native (url-polyfill/AsyncStorage,
anon key) y no corre en Node ni escribe sin sesion — el script construye su
propio cliente `@supabase/supabase-js` con la SERVICE ROLE KEY (variables
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, SIN prefijo `EXPO_PUBLIC_` para que
Expo nunca las incluya en el bundle), justificado porque una carga historica
masiva no tiene un usuario con `Person` reclamada detras y el service role
bypassa RLS; (3) insercion DIRECTA (no via RPC `create_activity_result_with_
awards`, que exige >=1 medalla y fija `auth.uid()`), replicando las invariantes
de dominio en la capa de transformacion pura; (4) normalizacion de nombres de
actividad en dos capas — `canonicalKey` determinista (trim + colapsar espacios +
quitar tildes + minusculas) que colapsa variantes de caja/tilde/espacio, y un
`ALIAS_MAP` curado y conservador para typos inequivocos del mismo nombre
(`lazamiento de disco`->`lanzamiento de disco`, `petnca`->`petanca`,
`sprin`->`sprint`, `kingdomio`->`kingdomino`, `cricket`/`criquet`), con
`DISPLAY_OVERRIDES`/`preferredDisplayName` para el nombre bonito (Fronton,
Futbol, Catan, Call of Duty). NO se sobre-fusionan sub-variantes semanticas
(Fronton parejas, Jr., infantil) — limitacion documentada en `design.md` §9.

Implementacion (subagente `implementer`): `src/scripts/historico/`
`types.ts`/`normalizeActivityName.ts`/`buildImportPlan.ts` (puros) e
`importHistorico.ts` (I/O: cliente service role, guarda de idempotencia + flag
`--reset`, mapas jsonId->uuid, verificacion post-carga de totales). Tests en
`src/__tests__/scripts/historico/`: `normalizeActivityName.test.ts` (11),
`buildImportPlan.test.ts` (6, contra el JSON real: 17 ediciones, 21 personas,
dedup de actividades de los ejemplos de aceptacion, 995 resultados + 1 skipped,
fidelidad participacion con/sin medalla, y la tabla completa de totales oro/
plata/bronce por persona de `design.md` §8 = hoja RESULTADOS, p.ej. sergio
347/225/129=701, david 283/201/93=577) y `security.test.ts` (3, R7.3: la service
role key solo aparece en `src/scripts/`, `importHistorico.ts` no importa
`@/services/supabase`). Actualizados `.env.example` (variables sin
`EXPO_PUBLIC_`, con comentario de seguridad), `supabase/README.md` (ejecucion via
`npx tsx`, orden tras migraciones, `--reset`, justificacion service role,
limitacion de normalizacion), `tsconfig.json` (+`node` a types) y `package.json`
(devDeps `@types/node`, `tsx`).

Revision (subagente `reviewer`): **APTO PARA DONE, sin hallazgos bloqueantes**.
Confirmo el aislamiento de la service role key con test real (no tautologico),
la dedup sin sobre-fusion (verificada contra el JSON: `Fronton parejas`/
`infantil`/`Colonos de Catan`/`Futbolin` NO colapsan), la fidelidad R4/R5 y los
totales R6 comparados uno a uno. No bloqueantes: (1) faltan tests negativos que
fuercen las ramas de validacion de `buildImportPlan` (el JSON real es limpio);
(2) `importHistorico.ts` ejecuta `main()` sin guarda `require.main === module`
(sin riesgo hoy, nadie lo importa). NIT: `Fronton equios` (typo real) queda como
Activity aparte, fuera del alcance de los ejemplos exigidos y documentado.

Verificacion de cierre: `npm run typecheck` limpio; las 3 suites nuevas verdes
(20/20). `npm test` completo: 26 suites PASS, 1 suite FALLA
(`src/__tests__/app/index.test.tsx`, 4 tests) por `useSafeAreaInsets()` sin
`SafeAreaProvider` en `src/app/index.tsx` — AJENO a f-008 (que no toca `src/app`,
`Screen.tsx` ni el pin de `react-native-safe-area-context`, fijo en 5.7.0 sin
cambios). La causa es una llamada directa a `useSafeAreaInsets` anadida a
`src/app/index.tsx` por trabajo concurrente en `src/app` (f-013/f-014, otros
orquestadores); NO se toca desde f-008 por la regla "no tocar su trabajo".
`feature_list.json` -> `f-008-historical-data-import` a `status: done`,
`spec_path` fijado. **El backlog NO queda agotado**: durante esta sesion otros
orquestadores anadieron `f-013-auth-choice-screen` (in-progress) y
`f-014-bottom-tabs-navigation` (backlog). Pendiente del usuario (no lo hace el
agente): rellenar `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` y ejecutar
`npx tsx src/scripts/historico/importHistorico.ts` contra el Supabase real.

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 - f-013-auth-choice-screen (done)

Pantalla previa de eleccion de sesion (gate de bienvenida) antes del home para
visitantes sin sesion que aun no han elegido "invitado" en la sesion actual de la
app. Spec en `specs/f-013-auth-choice-screen/` (requirements EARS R1-R5, design,
tasks 13/13). No reimplementa el OAuth de f-011 ni el modo lectura publica de
f-012: solo anade la pantalla de entrada. Dependencias f-011 y f-012 ya `done`.

Decision de diseno clave: el estado "eligio invitado" (`guestChosen`) vive SOLO en
memoria dentro de `AuthContext` (no AsyncStorage) — es MAS correcto que persistir,
porque el AC exige que la pantalla reaparezca al reabrir la app; ademas se resetea
en `signOut` (para volver a mostrarla tras cerrar sesion). Alternativas (contexto
separado, derivar del route, AsyncStorage) descartadas y documentadas en `design.md`.

Implementacion (subagente `implementer`): `src/context/AuthContext.tsx` ampliado con
`guestChosen`/`chooseGuest` y wrapper de `signOut` que resetea el flag; nueva
pantalla `src/app/welcome.tsx` (llama a `signInWithGoogle()` directamente como
`sign-in.tsx`, no navega a `/sign-in`; "Continuar como invitado" hace `chooseGuest()`
+ `router.replace('/')`; loading/error inline); boton con branding OFICIAL de Google
`src/components/GoogleSignInButton.tsx` + logo multicolor SVG `src/components/GoogleGLogo.tsx`
(colores `#4285F4/#34A853/#FBBC05/#EA4335`, fondo `#FFFFFF`, borde `#747775`, etiqueta
sans-serif, `accessibilityRole/Label`), no un glyph monocromo. Dependencia nueva
`react-native-svg` via `npx expo install`. `AuthGate` en `src/app/_layout.tsx` ampliado
para redirigir a `/welcome` (visitante sin sesion ni `guestChosen`, exceptuando
`/sign-in`) manteniendo la PRECEDENCIA del gate de `/claim-person` de f-011; anadido
`<Stack.Screen name="welcome" headerShown:false>`. Tests: `welcome.test.tsx`,
`GoogleSignInButton.test.tsx`, `_layout.test.tsx` (AuthGate directo) y ampliacion de
`AuthContext.test.tsx` (ciclo `guestChosen` false->true->false).

Revision (subagente `reviewer`): una ronda con **1 BLOQUEANTE** — el `useEffect` del
`AuthGate` solo comprobaba `if (loading) return;` sin `fontsReady`, abriendo una
carrera "navigate before mounting the Root Layout" (incumplia R1.2). Corregido:
guard `if (loading || !fontsReady) return;` + `fontsReady` en dependencias, y anadido
test directo del gate (`_layout.test.tsx`) que ademas cubre R1.1/R1.3/R1.4/R5.1 (hueco
de cobertura que el reviewer marco). Re-verificado el fix por el orchestrator leyendo
`_layout.tsx`: **BLOQUEANTE CERRADO**. Sugerencias no bloqueantes dejadas para futuro:
inconsistencia de marca entre el boton de Google de `/welcome` (oficial) y el de
`/sign-in` (monocromo, fuera de alcance de f-013) y la doble llamada inocua a
`router.replace('/')` en "invitado".

Verificacion de cierre: `npx tsc --noEmit` limpio; `npm test` 30 suites (29 PASS, 1
FALLA), 165 tests (161 PASS, 4 FALLAN). Los 4 fallos son los PREEXISTENTES y ajenos a
f-013 en `src/__tests__/app/index.test.tsx` (`HomeScreen` usa `useSafeAreaInsets` sin
`<SafeAreaProvider>` en el test) — ninguno de los archivos de f-013 interviene en esa
cadena, y todas las suites propias de f-013 (`welcome`, `GoogleSignInButton`,
`_layout`, `AuthContext`) pasan en verde. No se toco `src/scripts/historico/**` (f-008)
ni la navegacion por tabs (f-014). `feature_list.json` -> `f-013-auth-choice-screen`
a `status: done`. Backlog restante: `f-014-bottom-tabs-navigation` (should, lo coordina
otro orquestador).

## 2026-07-20 - f-007-activity-ranking (done)

Historico y clasificacion por actividad: elegir una actividad y ver todas sus
pruebas historicas (con medallas y ganadores) a lo largo de todas las ediciones,
mas su clasificacion agregada SOLO dentro de esa actividad (no global), con
participaciones y promedio de medallas por participacion en la actividad
(equivalente a la hoja CATAN del xlsx, generalizada). Spec en
`specs/f-007-activity-ranking/` (requirements EARS R1-R4, design, tasks 10/10).
Vista de solo lectura, accesible sin sesion: sin migracion ni RLS nueva (se apoya
en la lectura publica `anon` de activities/editions/activity_results/medal_awards/
people de f-010).

Implementacion (subagente `implementer`, generalizando el patron de f-005/f-006):
en `src/services/rankings.ts` se anadio `listActivityRanking(activityId)`
(reutiliza el helper `buildRanking`, filtra `activity_results` por
`.eq('activity_id', ...)` en todas las ediciones) y el alias `ActivityRankingRow`;
`sortHistoricRanking` se generalizo a `sortRanking(rows, mode)` manteniendo
`sortHistoricRanking` como alias exportado (`export const sortHistoricRanking =
sortRanking;`) para no romper f-006. En `src/services/activityResults.ts` se anadio
`listActivityHistory(activityId)` (+ tipos `ActivityHistoryEntry`/
`ActivityHistoryMedal`): pruebas de la actividad con año/label de edicion, nº de
participantes y medallas con nombres de ganadores, ordenadas de reciente a antigua
(editionYear desc, luego playedAt desc con nulos al final) y medallas en orden fijo
oro/plata/bronce; corta antes de consultar editions/people/medal_awards si no hay
pruebas. Pantallas publicas nuevas: `src/app/rankings/activities/index.tsx`
(selector/buscador de actividad, patron de f-003, EmptyState) y
`rankings/activities/[id].tsx` (histrico de pruebas + clasificacion con toggle
"Por medallas"/"Por promedio" reordenado en cliente via `useMemo`+`sortRanking` sin
re-fetch). Rutas `rankings/activities/index` y `rankings/activities/[id]` registradas
en `_layout.tsx`; en la Home la NavCard "Clasificacion por actividad" paso de
"PROXIMAMENTE" (seccion ya retirada, quedaba vacia) a tarjeta publica activa en
EXPLORAR. Tests: ampliado `src/__tests__/services/rankings.test.ts`
(`listActivityRanking` con filtro por actividad, agregacion multi-edicion,
participacion sin medalla, sin pruebas, y `sortHistoricRanking === sortRanking`),
nuevo `src/__tests__/services/activityHistory.test.ts` (filtro, ganadores, año,
participantes, orden, sin pruebas) y nuevo `src/__tests__/app/rankings-activities.test.tsx`
(selector filtra/navega, detalle con histrico+clasificacion, toggle sin re-consultar,
sin controles de escritura, estados vacios).

Revision (subagente `reviewer`): **APTO PARA DONE, sin hallazgos bloqueantes ni
menores**. Confirmo que la clasificacion agrega solo las pruebas de la actividad
(filtro `.eq('activity_id', ...)`, no global), el histrico multi-edicion con
ganadores/orden/medallas, participaciones+promedio con participacion sin medalla a
0.00, el toggle sin re-fetch (`toHaveBeenCalledTimes(1)`), acceso publico sin ningun
control de escritura, ausencia de migracion/RLS nueva (RLS publica de f-010 intacta,
sin hueco) y f-005/f-006 sin romper (`sortHistoricRanking` sigue exportado y
equivalente). Unica NOTA no bloqueante: fallback defensivo `editionYear ?? 0` en
`listActivityHistory`, no alcanzable en produccion por la FK `activity_results.edition_id`.

Verificacion de cierre: `npm.cmd run typecheck` limpio; `npm.cmd test -- --runInBand`
24 suites / 131 tests PASS (incluidos los heredados de f-005/f-006). `feature_list.json`
-> `f-007-activity-ranking` a `status: done`. Siguiente y ultima feature del backlog:
`f-008-historical-data-import` (should, dependencias cumplidas).

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-20 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```

## 2026-07-21 — cierre de sesion automatico

Cambios sin commitear detectados al cerrar sesion:

```
historico-medallas.xlsx | Bin 512353 -> 0 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)
```
