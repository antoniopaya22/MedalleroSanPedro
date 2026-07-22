# ADR 0001: Supabase como backend único (Auth + base de datos)

## Estado

Aceptado.

## Contexto

MedalleroSanPedro es una app familiar para registrar y consultar el histórico de medallas de las actividades de San Pedro. El requisito explícito del usuario es que esté **sincronizada** entre todos los dispositivos/personas de la familia: no hay requisito de acceso offline durante un evento concreto, a diferencia de una app de viajes. No hay proyecto Supabase previo asociado a esta app (se crea uno nuevo, independiente del de ViajaPayá).

## Decisión

- **Supabase Postgres** como única fuente de verdad, sin caché local ni modo local-first: todas las lecturas y escrituras pasan por `src/services/` contra Supabase.
- **Supabase Auth** para login, exclusivamente con proveedor Google (ver ADR [0002](0002-google-sso-person-claim.md)).
- El cliente de Expo usa únicamente `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` (claves públicas, protegidas por Row Level Security). La contraseña de la base de datos y el project ref **no** se usan desde el cliente — solo para tareas locales de desarrollo (CLI, migraciones).

## Gestión de secretos

- `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`, `SUPABASE_PROJECT_REGION` y las credenciales OAuth de Google viven únicamente en `.env.local` (gitignored, nunca comiteado). Ver `.env.example` para la plantilla sin valores.
- Row Level Security (RLS) debe estar activo en todas las tablas desde el primer día: sin RLS, la clave `anon` pública da acceso de escritura sin restricción. El modo de lectura pública (ver ADR [0003](0003-public-readonly-access.md)) se implementa como políticas RLS de `SELECT` abiertas, no desactivando RLS.

## Consecuencias

- Las tablas de Postgres reflejan el modelo de [domain-model.md](../domain-model.md): `editions`, `people`, `profiles`, `activities`, `activity_results`, `medal_awards`.
- Se necesita conectividad para cualquier lectura o escritura; no hay modo sin conexión en esta primera versión.

## Disparador para reconsiderar

Si en el futuro se necesita consultar el ranking sin conexión (p. ej. durante los juegos, en una zona sin cobertura), reabrir esta decisión y evaluar una caché local de solo lectura.
