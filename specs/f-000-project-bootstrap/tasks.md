# f-000-project-bootstrap — Tareas

- [x] Inicializar el proyecto Expo (última SDK estable) con TypeScript y Expo Router, con las rutas bajo `src/app/`
- [x] Configurar `app.json` con la identidad EAS: slug `medallerosanpedro`, owner `payarroni`, `extra.eas.projectId` `19176f10-94cd-4746-abc3-171ef40e2218`
- [x] Activar TypeScript estricto (`strict: true`) y el alias `@/*` → `src/*` en `tsconfig.json`
- [x] Hacer que el alias `@/*` resuelva también en runtime (Metro/Babel) y en Jest (`moduleNameMapper`)
- [x] Crear el layout raíz `src/app/_layout.tsx` (Stack) y la home mínima `src/app/index.tsx` (copy en español)
- [x] Crear las carpetas de arquitectura bajo `src/` (`components`, `services`, `types`, `hooks`, `constants`, `utils`, `__tests__`) con placeholder donde no haya contenido
- [x] Instalar y configurar `jest-expo` + `@testing-library/react-native` (v14) y el script `test` en `package.json`
- [x] Escribir un test de ejemplo en `src/__tests__` que pase (render de la home con `await render`, o utilidad importada vía `@/`)
- [x] Verificar `npm test` en verde
- [x] Verificar `npx tsc --noEmit` sin errores
- [x] Verificar que `npx expo start` arranca el bundler sin errores (o `expo-doctor`/`expo export` como validación no interactiva)
- [x] Actualizar `docs/tech-stack.md` con las versiones reales instaladas (Expo SDK, React Native, jest-expo, RNTL)
