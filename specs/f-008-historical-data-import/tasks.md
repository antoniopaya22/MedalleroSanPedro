# f-008-historical-data-import — Tareas

Orden de implementación. Marcar `- [x]` un item a la vez (nunca en bloque).
El código puro va en `src/scripts/historico/`, los tests en
`src/__tests__/scripts/historico/`. El script NO es una pantalla de la app y NO
importa `@/services/supabase`.

- [x] 1. Definir tipos del JSON de origen y del plan en `src/scripts/historico/types.ts` (`HistoricoJson`, `ImportPlan`, reutilizando `Medal` de `@/types/domain`).
- [x] 2. Implementar `src/scripts/historico/normalizeActivityName.ts`: `canonicalKey`, `ALIAS_MAP`, `resolveKey`, `DISPLAY_OVERRIDES`, `preferredDisplayName` (R3.1-R3.4), conservador (R3.5).
- [x] 3. Test `src/__tests__/scripts/historico/normalizeActivityName.test.ts`: casos de caja/tilde/espacio, alias de typos y elección de nombre preferente (ejemplos de aceptación).
- [x] 4. Implementar `src/scripts/historico/buildImportPlan.ts`: construye `ImportPlan` (ediciones, personas, actividades deduplicadas, resultados con participantes y medallas), omite pruebas sin participantes a `skipped` (R4.5), valida invariantes de dominio (R4.4).
- [x] 5. Test `src/__tests__/scripts/historico/buildImportPlan.test.ts` contra `data/historico-medallas.json`: 17 ediciones, 21 personas, dedup de actividades (ejemplos), 995 resultados + 1 omitido, fidelidad de participación con/sin medalla (R4/R5) y totales por persona = tabla RESULTADOS (R6.1).
- [x] 6. Implementar `src/scripts/historico/importHistorico.ts`: cliente Node service role (R7.1/R7.4), guarda de idempotencia y `--reset` (R8), inserción directa de ediciones/personas/actividades/resultados/medallas con mapas jsonId→uuid, y verificación post-carga de totales (R6.1). No importa `@/services/supabase` (R9.2).
- [x] 7. Test `src/__tests__/scripts/historico/security.test.ts` (R7.3): la service role key / `service_role` no aparece fuera de `src/scripts/`, e `importHistorico.ts` no importa el cliente RN.
- [x] 8. Actualizar `.env.example` con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (placeholders, sin prefijo `EXPO_PUBLIC_`, con comentario de seguridad, R7.2/R7.5).
- [x] 9. Documentar en `supabase/README.md`: cómo ejecutar el import (`npx tsx ...`, variables, orden tras migraciones, flag `--reset`) y justificación del service role (R9.3). Documentar la limitación de normalización (R3.5).
- [x] 10. Verificación final: `npm run typecheck` limpio y `npm test` verde (incluidas las nuevas suites).
