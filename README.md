# Medallero San Pedro

![Expo](https://img.shields.io/badge/Expo-57-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)

Aplicación móvil para llevar el **medallero histórico** de las actividades, deportes y juegos de mesa de las fiestas de San Pedro: resultados (oro, plata y bronce) de cada prueba, clasificaciones por edición y el histórico de todos los años.

## Funcionalidades

- **Acceso con Google** o como invitado en **modo solo lectura**.
- Gestión de **participantes**, **ediciones** (años) y **catálogo de actividades**.
- **Registro de resultados** como asistente paso a paso.
- **Clasificaciones**: por edición, histórica y por actividad, con filtros por rango de años y conmutador puntos/medallas.
- **Ficha de participante** con resumen de medallas, histórico y gráficos de rendimiento.
- **Importación del histórico** desde la hoja de cálculo original (`data/historico-medallas.xlsx`).
- Navegación por pestañas y tema claro/oscuro.

## Stack

Expo Router, React Native y TypeScript estricto, con Supabase (Auth con Google SSO + Postgres con RLS) como backend. Tests con Jest.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellena las variables de Supabase
npm start                    # expo start
npm run web
npm run typecheck
npm test
```

> Las variables `EXPO_PUBLIC_*` acaban en el bundle de la app. La *service role key* solo se usa en el script de importación del histórico y nunca debe llevar ese prefijo.

## Cómo se ha construido

El proyecto se desarrolla con agentes de código siguiendo un flujo **backlog → spec → progreso**:

- `feature_list.json`: backlog de funcionalidades y su estado.
- `specs/<feature>/`: requisitos (EARS), diseño y tareas de cada funcionalidad.
- `docs/`: arquitectura, modelo de dominio, convenciones, stack y ADRs.
- `AGENTS.md`: guía para los agentes.
