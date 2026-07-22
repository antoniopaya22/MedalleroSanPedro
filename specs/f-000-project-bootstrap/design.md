# f-000-project-bootstrap — Diseño técnico

## Objetivo

Levantar el esqueleto Expo Router + TypeScript estricto + testing dentro de `src/`,
alineado con `docs/architecture.md`, `docs/conventions.md` y `docs/tech-stack.md`.
Nada de dominio, Supabase ni auth.

## Decisiones

- **Expo SDK:** usar la última versión estable que instale `create-expo-app` en el
  momento del bootstrap (el proyecto no fija SDK todavía, ver `docs/tech-stack.md`).
  Plantilla base: `expo` con TypeScript + Expo Router (template `default`/`tabs` no;
  preferible partir de la plantilla con Expo Router y luego mover a `src/app`, o usar
  la plantilla que ya coloque rutas y adaptarla).
- **Raíz de rutas en `src/app`:** Expo Router detecta `src/app` automáticamente si
  existe (ver `docs/architecture.md`). No debe quedar un `app/` en la raíz del repo.
- **Alias `@/*`:** declarar en `tsconfig.json` (`compilerOptions.paths`) y hacer que
  Jest lo resuelva vía `moduleNameMapper` (`^@/(.*)$` → `<rootDir>/src/$1`). Si se usa
  Babel para runtime, `babel-plugin-module-resolver` o el soporte nativo de Metro para
  `tsconfig` paths.
- **TypeScript estricto:** `strict: true` en `tsconfig.json` (extendiendo
  `expo/tsconfig.base`).
- **Testing:** `jest-expo` como preset + `@testing-library/react-native` (v14, render
  asíncrono — `await render`). Script `test` en `package.json` → `jest`.
- **Identidad EAS:** `app.json` con `slug: medallerosanpedro`, `owner: payarroni`,
  `extra.eas.projectId: 19176f10-94cd-4746-abc3-171ef40e2218`.

## Archivos / carpetas a tocar (todo bajo `src/` salvo config de raíz)

- Raíz: `package.json`, `app.json` (o `app.config.ts`), `tsconfig.json`,
  `babel.config.js`, `metro.config.js` (si hace falta), `jest.config.js` o `jest`
  en `package.json`, `.gitignore` (ya existe, revisar), `assets/` (iconos/splash).
- `src/app/_layout.tsx` — layout raíz de Expo Router (Stack).
- `src/app/index.tsx` — home mínima ("MedalleroSanPedro" + placeholder), copy en español.
- `src/app/+not-found.tsx` — pantalla 404 (opcional pero recomendable).
- Carpetas placeholder según arquitectura: `src/components/`, `src/services/`,
  `src/types/`, `src/hooks/`, `src/constants/`, `src/utils/`, `src/__tests__/`.
  Para carpetas sin contenido real, un `.gitkeep` o un archivo mínimo justificado.
- `src/__tests__/` — un test de ejemplo (ver abajo).

## Test de ejemplo

Dos opciones válidas; basta con una que pase y demuestre el stack:

- **Preferida:** `src/__tests__/app/index.test.tsx` que renderice la home con RNTL
  (`await render(<Index />)`) y compruebe que aparece el texto de bienvenida. Verifica
  RNTL + alias `@/`.
- **Alternativa mínima:** un test puro en `src/__tests__/utils/` sobre una utilidad
  trivial (p. ej. `src/utils/greeting.ts`) importada vía `@/utils/greeting`, para
  verificar jest-expo + alias sin depender del render.

Se recomienda al menos el test de render de la home para ejercitar RNTL asíncrono.

## Modelo de datos

Ninguno. Esta feature no introduce entidades de dominio (ver `docs/domain-model.md`
para el modelo futuro; queda intacto).

## Edge cases / gotchas

- **RNTL 14 asíncrono:** `render` y `rerender` deben ir con `await`, si no el árbol
  llega vacío sin error claro (ver `docs/conventions.md`).
- **`src/app` vs `app`:** asegurarse de que NO queda un `app/` en la raíz que compita
  con `src/app`.
- **Alias en dos sitios:** el alias tiene que funcionar tanto en runtime (Metro/Babel)
  como en Jest; validar ambos, no solo `tsc`.
- **`expo start` en CI/headless:** verificar con `npx expo start` que arranca el bundler;
  no requiere abrir simulador. Alternativamente `npx expo export`/`expo-doctor` para
  validación no interactiva.
- **Windows:** rutas y scripts deben funcionar en PowerShell (entorno del usuario).

## Verificación (Definition of Done)

- `npm test` verde con el test de ejemplo.
- `npx tsc --noEmit` sin errores.
- `npx expo start` arranca el bundler sin errores (o `expo-doctor` / `expo export`
  como validación no interactiva documentada).
- Estructura de `src/` conforme a `docs/architecture.md`.
