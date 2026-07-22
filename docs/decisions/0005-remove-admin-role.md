# ADR 0005: Eliminar el rol admin — cualquier usuario autenticado puede escribir

## Estado

Aceptado. Sustituye la sección "Roles" de [0002-google-sso-person-claim.md](0002-google-sso-person-claim.md); el resto de ese ADR (login solo con Google, onboarding de reclamar `Person`) sigue vigente sin cambios.

## Contexto

El ADR 0002 introdujo un rol `admin` (único capaz de escribir datos y de promover a otros a admin) y un rol `member` (autenticado, pero con el mismo acceso de solo lectura que un visitante anónimo). En la práctica, MedalleroSanPedro es una app familiar de un grupo pequeño y de confianza: cualquiera que se molesta en iniciar sesión con Google y reclamar su `Person` es un participante real del medallero, y la fricción de necesitar un admin para registrar cualquier resultado —con el problema añadido de quién es el primer admin— no aporta valor proporcional a la complejidad.

## Decisión

- Se elimina el concepto de rol: ya no existen `admin` ni `member` como niveles distintos de permiso.
- Cualquier usuario autenticado con Google **y con su `Person` ya reclamada** puede crear/editar `Person`, `Edition`, `Activity`, `ActivityResult` y `MedalAward`.
- Un usuario autenticado que todavía no ha reclamado su `Person` sigue sin poder escribir — la reclamación de persona (ADR 0002) sigue siendo el único requisito antes de poder editar, ahora el único.
- El acceso anónimo (sin sesión) sigue siendo de solo lectura, sin cambios (ver [0003-public-readonly-access.md](0003-public-readonly-access.md)).

## Consecuencias

- `Profile` pierde el campo `role`: queda `userId, email, personId`.
- Las políticas RLS de escritura pasan de exigir `role = 'admin'` a exigir sesión válida con `person_id` no nulo en `profiles` (`auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND person_id IS NOT NULL)`).
- Desaparece el problema de "quién es el primer admin": ya no hay paso manual de bootstrap de rol tras el despliegue.
- Ya no existe una acción de "promover a admin"; se simplifica la pantalla de gestión de usuarios (si llega a existir).

## Disparador para reconsiderar

Si en el futuro se abre la app a gente fuera del círculo de confianza familiar, o se detectan ediciones vandálicas/erróneas del histórico, reabrir esta decisión y reintroducir algún nivel de permisos por encima de "autenticado con persona reclamada".
