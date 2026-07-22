# Arquitectura

## Estado

Harness listo, app sin arrancar todavía. Esta arquitectura es el objetivo para cuando se implemente `f-000-project-bootstrap`.

## Enrutado

Expo Router, con `src/app/` como raíz de rutas (Expo Router detecta automáticamente `src/app` si existe, sin necesidad de un `app/` en la raíz del repo). Todo el código vive bajo `src/`; solo `assets/` queda en la raíz del repo (convención de `app.json` para iconos/splash).

## Capas

```
src/
├── app/          # rutas (Expo Router): pantallas y layouts
├── components/   # componentes de UI reutilizables
├── services/     # acceso a datos/persistencia (capa única de storage)
├── types/        # tipos TypeScript del dominio
├── hooks/        # hooks reutilizables
├── constants/    # constantes, temas, configuración estática
├── utils/        # utilidades puras sin estado
└── __tests__/    # tests, espejo de las carpetas anteriores
```

## Estado, persistencia y backend

Estado local por pantalla/componente (sin store global inicialmente). Toda persistencia pasa por una capa de servicios única en `src/services/`, para poder cambiar la estrategia sin tocar componentes.

Backend: Supabase (Auth con Google SSO + Postgres) como única fuente de verdad y punto de sincronización entre dispositivos. Ver [decisions/0001-supabase-backend.md](decisions/0001-supabase-backend.md) y [decisions/0002-google-sso-person-claim.md](decisions/0002-google-sso-person-claim.md). El cliente de Supabase se inicializa en `src/services/supabase.ts` leyendo `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` de variables de entorno, nunca hardcodeadas.

A diferencia de una app local-first, aquí no hay requisito de acceso offline: es una app de consulta/registro puntual (durante los juegos de San Pedro o para ver el histórico), así que el modelo por defecto es "online, contra Supabase" — no se añade caché local salvo que una feature futura lo justifique explícitamente.

## Navegación (previsto)

- Modo público (sin sesión): listado de ediciones, ranking histórico, ranking por edición, ranking por actividad — todo de solo lectura.
- Login con Google → si el `Profile` no tiene `personId`, pantalla de onboarding para reclamar qué persona del histórico es (ver ADR 0002) → resto de la app.
- Con sesión y `Person` reclamada: mismas pantallas de lectura, más altas de `Activity`/`ActivityResult`/`MedalAward` y gestión de `Person`. No hay roles: cualquier usuario en este estado tiene los mismos permisos de escritura.

Esto se refinará cuando se implemente `f-000` y las features de navegación asociadas.
