# f-016-edition-detail-view - Tareas

- [x] Mover el formulario actual `src/app/(tabs)/editions/[id].tsx` a `src/app/(tabs)/editions/[id]/edit.tsx` (contenido casi intacto; ajustar el destino del `router.replace` del guard `!canWrite`) y eliminar `[id].tsx`
- [x] Crear `src/app/(tabs)/editions/[id]/index.tsx`: vista de detalle publica (cabecera edicion + participantes/clasificacion via `listEditionRanking`, `useFocusEffect`, estado vacio, edicion inexistente, error recuperable)
- [x] Actualizar `src/app/(tabs)/editions/_layout.tsx`: sustituir `Stack.Screen name="[id]"` por `[id]/index` (detalle) y `[id]/edit` (formulario)
- [x] (Opcional/preferido) Extraer componente presentacional compartido de lista de ranking reutilizado por el detalle y por `rankings/editions/[id].tsx`
- [x] Anadir FAB local en el detalle (visible solo si `canWrite`) que navega a `/results/new` con `params: { editionId: id }`
- [x] Anadir en el detalle el punto de entrada a `/editions/[id]/edit` visible solo si `canWrite`
- [x] Modificar `src/app/results/new.tsx` para leer `editionId` de params y preseleccionar esa edicion tras cargar (sin romper el flujo sin parametro)
- [x] Modificar `src/app/(tabs)/editions/index.tsx`: navegacion al detalle para cualquier usuario (`onPress` y `showChevron` ya no condicionados a `canWrite`); mantener "Anadir edicion" bajo `canWrite`
- [x] Tests app detalle: participantes+clasificacion, estado vacio, edicion inexistente, FAB solo con `canWrite` (anonimo/sin Person no lo ve)
- [x] Tests app `results/new`: preseleccion con `editionId` y arranque sin parametro
- [x] Tests app `[id]/edit`: acceso bloqueado (redirige) sin `canWrite`
- [x] `npx tsc --noEmit` limpio y `npm test` en verde
