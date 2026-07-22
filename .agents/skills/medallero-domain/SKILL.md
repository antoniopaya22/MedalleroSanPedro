---
name: medallero-domain
description: Modelo de dominio específico de MedalleroSanPedro (Edition, Person, Profile, Activity, ActivityResult, MedalAward) y permisos (autenticado con persona reclamada / anónimo). Usar al trabajar en src/types/, src/services/, o al escribir specs/<id>/design.md que involucre entidades del dominio.
---

# Dominio MedalleroSanPedro

Referencia rápida — la fuente completa está en [docs/domain-model.md](../../../docs/domain-model.md), léela si necesitas más detalle.

## Entidades

- **Edition** — una edición/año del medallero. `id, year, label?, startDate?, endDate?`.
- **Person** — persona del roster histórico que puede ganar medallas. `id, name, active, claimedByUserId?`.
- **Profile** — perfil de un usuario autenticado (Google SSO). `userId, email, personId?`. Se enlaza a una `Person` en el onboarding (ver ADR [0002](../../../docs/decisions/0002-google-sso-person-claim.md)). Sin campo de rol — ver ADR [0005](../../../docs/decisions/0005-remove-admin-role.md).
- **Activity** — catálogo de actividades/juegos, reutilizable. `id, name`.
- **ActivityResult** — una celebración concreta de una `Activity` dentro de una `Edition` (una "prueba"). `id, editionId, activityId, participantIds[], playedAt?, notes?`. `participantIds` = todas las personas que participaron en la prueba (ganaran medalla o no); "participó sin medalla" es un estado de primera clase almacenado (censo de la prueba), no derivado de las medallas.
- **MedalAward** — medalla de un color (`ORO`/`PLATA`/`BRONCE`) otorgada en un `ActivityResult` a una o varias personas (varias = equipo o empate). `id, resultId, medal, personIds[]`.

## Reglas clave

- Como mucho un `MedalAward` por color y por `ActivityResult` — un equipo ganador es un único `MedalAward` de `ORO` con varias `personIds`, no varias medallas.
- Una `Person` no puede tener más de un `MedalAward` en el mismo `ActivityResult`.
- Todo ganador (`personIds` de un `MedalAward`) está también en `participantIds` de su `ActivityResult`; `participantIds` no tiene duplicados.
- Los rankings (edición/histórico/por actividad) se calculan agregando `MedalAward`, nunca se almacenan. El "promedio de medallas por participación" (medallas ÷ pruebas en las que figura en `participantIds`) es otra vista calculada posible.

## Permisos

No hay roles: solo dos niveles.

- **Anónimo**: solo lectura de todo (editions, activities, results, rankings).
- **Autenticado con `Person` reclamada**: mismo acceso de lectura, más CRUD de `Person`/`Edition`/`Activity`/`ActivityResult`/`MedalAward`. Autenticado sin `Person` reclamada todavía = sin escritura (pendiente de onboarding).

## Convenciones de dominio

- Todo dato pasa por `src/services/` (capa única de acceso a Supabase), nunca acceso directo a la base desde componentes.
- Copy visible al usuario en español; nombres de campos/tipos en inglés (ver [docs/conventions.md](../../../docs/conventions.md)).
