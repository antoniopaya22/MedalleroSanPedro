# f-000-project-bootstrap — Requisitos

Bootstrap del proyecto Expo real dentro de `src/`: Expo Router, TypeScript estricto,
alias `@/*`, testing con `jest-expo` + React Native Testing Library. Sin Supabase
(eso es `f-010`) ni auth (eso es `f-011`): solo el esqueleto navegable con una home
casi vacía.

## Alcance

- **Incluye:** inicialización del proyecto Expo, Expo Router con `src/app`, TypeScript
  estricto, alias `@/*` → `src/*`, configuración de jest-expo + RNTL, un test de ejemplo
  en `src/__tests__`, esqueleto de carpetas de `docs/architecture.md`.
- **Excluye:** cliente de Supabase, variables de entorno de backend, auth Google SSO,
  modelo de dominio, cualquier pantalla de negocio (ediciones/rankings/resultados).

## Requisitos EARS

### R1 — Arranque de la app

- CUANDO un desarrollador ejecuta `npx expo start` en la raíz del repo
  EL SISTEMA DEBERÁ arrancar el bundler de Expo sin errores de configuración ni de
  resolución de módulos.
- CUANDO Expo Router resuelve las rutas de la app
  EL SISTEMA DEBERÁ tomar `src/app/` como raíz de rutas (sin necesidad de un `app/`
  en la raíz del repo).
- CUANDO un usuario abre la app por primera vez
  EL SISTEMA DEBERÁ mostrar una pantalla de inicio (home) navegable, aunque sea de
  contenido mínimo, sin pantallas de error.

### R2 — Alias de imports `@/*`

- CUANDO un módulo importa usando el prefijo `@/` (por ejemplo `import x from "@/utils/x"`)
  EL SISTEMA DEBERÁ resolver ese import a la ruta equivalente bajo `src/*`.
- CUANDO se compila el proyecto con TypeScript
  EL SISTEMA DEBERÁ reconocer el alias `@/*` en `tsconfig.json` sin errores de
  resolución de tipos.
- CUANDO Jest ejecuta un test que importa vía `@/`
  EL SISTEMA DEBERÁ resolver el alias igual que en tiempo de ejecución (moduleNameMapper
  o preset equivalente).

### R3 — TypeScript estricto

- CUANDO se configura TypeScript
  EL SISTEMA DEBERÁ tener `strict: true` activado en `tsconfig.json`.
- CUANDO existe código fuente en `src/`
  EL SISTEMA DEBERÁ pasar la comprobación de tipos (`tsc --noEmit`) sin errores.

### R4 — Testing (jest-expo + RNTL)

- CUANDO un desarrollador ejecuta `npm test`
  EL SISTEMA DEBERÁ ejecutar Jest con el preset `jest-expo` y terminar con estado de
  éxito.
- CUANDO se ejecuta la suite de tests
  EL SISTEMA DEBERÁ incluir al menos un test de ejemplo en `src/__tests__` que pase.
- CUANDO un test renderiza un componente con React Native Testing Library
  EL SISTEMA DEBERÁ usar `await render(...)` (RNTL 14 es asíncrono, ver
  `docs/conventions.md`).

### R5 — Estructura de carpetas

- CUANDO se inicializa el proyecto
  EL SISTEMA DEBERÁ crear bajo `src/` las carpetas previstas en `docs/architecture.md`:
  `app/`, `components/`, `services/`, `types/`, `hooks/`, `constants/`, `utils/`,
  `__tests__/` (las que no tengan contenido aún pueden quedar con un placeholder).
- CUANDO se coloca código de aplicación
  EL SISTEMA DEBERÁ ubicarlo bajo `src/` y los tests bajo `src/__tests__/` (ninguna
  otra ubicación).

### R6 — Configuración EAS / identidad del proyecto

- CUANDO se configura `app.json`/`app.config`
  EL SISTEMA DEBERÁ reflejar la identidad del proyecto ya registrada en
  `docs/tech-stack.md`: slug `medallerosanpedro`, owner `payarroni`, EAS project ID
  `19176f10-94cd-4746-abc3-171ef40e2218`.

## Criterios de aceptación (verificables)

1. `npx expo start` arranca sin errores.
2. El alias `@/*` resuelve a `src/*` tanto en TypeScript como en Jest.
3. `npm test` pasa con al menos un test de ejemplo en `src/__tests__`.
4. `tsc --noEmit` no reporta errores con `strict: true`.
5. Existen las carpetas de `src/` según `docs/architecture.md`.

## Fuera de alcance explícito

- No inicializar el cliente de Supabase ni leer `EXPO_PUBLIC_SUPABASE_*` (f-010).
- No configurar Google OAuth ni pantallas de login/onboarding (f-011).
- No modelar `Edition/Person/Activity/...` ni pantallas de negocio.
