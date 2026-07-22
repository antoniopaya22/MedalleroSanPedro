# f-010-supabase-setup — Tareas

- [x] Añadir `@supabase/supabase-js` a `dependencies` de `package.json` e instalarlo
- [x] Crear `src/types/` con los tipos de dominio (Edition, Person, Profile, Activity, ActivityResult, MedalAward) y el tipo `Medal` (`gold | silver | bronze`), identificadores en inglés
- [x] Implementar `src/services/supabase.ts`: cliente único leyendo `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`, sin credenciales literales, con error claro si falta alguna variable
- [x] Crear la migración SQL bajo `supabase/migrations/` con las seis tablas (`editions`, `people`, `profiles`, `activities`, `activity_results`, `medal_awards`), sus constraints (uniques, FKs, enum `medal`, `unique(result_id, medal)`) y la extensión `pgcrypto`
- [x] Añadir el helper SQL `public.has_claimed_person()` y activar `ENABLE ROW LEVEL SECURITY` en las seis tablas
- [x] Definir políticas RLS: `SELECT` público en `editions/people/activities/activity_results/medal_awards`; `profiles` legible solo por su dueño; escritura solo `authenticated` con `person_id` no nulo; nada de escritura abierto a `anon`
- [x] Dejar comentado en el SQL qué queda delegado a f-011 (trigger de creación de `Profile`, política/RPC de reclamar `Person`) y a f-004 (invariantes ganador ⊆ participantes)
- [x] Escribir `src/__tests__/services/supabase.test.ts`: inicializa con env presentes, lanza error claro si faltan
- [x] Verificar `npm test` en verde
- [x] Verificar `npx tsc --noEmit` sin errores
- [x] Actualizar `docs/tech-stack.md` con la versión instalada de `@supabase/supabase-js`
- [x] Documentar el paso manual del usuario (crear proyecto Supabase, poner `EXPO_PUBLIC_*` en `.env.local`, aplicar migraciones, comprobar lectura anónima con rol `anon`)
