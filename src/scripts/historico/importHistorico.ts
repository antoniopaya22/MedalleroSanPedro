/**
 * Script de migración puntual (one-off): carga `data/historico-medallas.json`
 * en las tablas de dominio de Supabase (R1-R6, R8, R9).
 *
 * NO es una pantalla de la app ni se importa desde `src/app/`,
 * `src/components/` ni `src/services/` (R9.1/R9.2). Construye su PROPIO
 * cliente Node de `@supabase/supabase-js` con la **service role key**
 * (R7.1): la carga histórica no tiene un usuario autenticado con `Person`
 * reclamada detrás, y las políticas RLS de escritura de
 * `supabase/migrations/20260719120000_init_schema.sql` exigen
 * `has_claimed_person() = true`, que ninguna cuenta real satisface para una
 * migración masiva. La service role key bypassa RLS; por eso nunca se lee
 * desde `src/services/supabase.ts` (cliente React Native, anon key) ni se usa
 * fuera de este script (ver `src/__tests__/scripts/historico/security.test.ts`,
 * R7.3).
 *
 * Ejecución (ver `supabase/README.md` para el detalle):
 *   npx tsx src/scripts/historico/importHistorico.ts [--reset]
 *
 * Variables de entorno requeridas (sin prefijo `EXPO_PUBLIC_`, R7.2):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

import type { Medal } from '@/types/domain';
import { buildImportPlan } from './buildImportPlan';
import type { HistoricoJson, ImportPlan } from './types';

const DATA_FILE_PATH = path.join(__dirname, '..', '..', '..', 'data', 'historico-medallas.json');

/**
 * Lee una variable de entorno obligatoria sin volcar su valor en logs
 * (R7.4): si falta, aborta con un mensaje claro que solo menciona el nombre.
 */
function readRequiredEnvVar(name: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ` +
        '(sin prefijo EXPO_PUBLIC_, ver supabase/README.md) antes de ejecutar la importación.'
    );
  }
  return value;
}

function createServiceRoleClient() {
  const supabaseUrl = readRequiredEnvVar('SUPABASE_URL');
  const supabaseServiceRoleKey = readRequiredEnvVar('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

function readSourceJson(): HistoricoJson {
  const raw = fs.readFileSync(DATA_FILE_PATH, 'utf8');
  return JSON.parse(raw) as HistoricoJson;
}

/**
 * Guarda de idempotencia (R8.1): si `editions` o `activity_results` ya tienen
 * filas y no se pidió `--reset`, aborta sin escribir nada.
 */
async function assertSafeToImport(client: ServiceRoleClient, reset: boolean): Promise<void> {
  const [editionsCount, resultsCount] = await Promise.all([
    client.from('editions').select('id', { count: 'exact', head: true }),
    client.from('activity_results').select('id', { count: 'exact', head: true }),
  ]);

  if (editionsCount.error) throw editionsCount.error;
  if (resultsCount.error) throw resultsCount.error;

  const hasData = (editionsCount.count ?? 0) > 0 || (resultsCount.count ?? 0) > 0;

  if (hasData && !reset) {
    throw new Error(
      'La base de datos ya tiene ediciones o resultados de dominio. Aborto sin escribir para no duplicar ' +
        'el histórico. Ejecuta con --reset si quieres borrar los datos de dominio y reimportar desde cero.'
    );
  }
}

/** Borra los datos de dominio en orden seguro de claves foráneas (R8.2). */
async function resetDomainData(client: ServiceRoleClient): Promise<void> {
  const deleteAll = async (table: string) => {
    // No hay columna "true" universal: se filtra por un id siempre distinto
    // de null para borrar todas las filas de la tabla.
    const { error } = await client.from(table).delete().not('id', 'is', null);
    if (error) {
      throw new Error(`No se pudo vaciar "${table}" en modo --reset: ${error.message}`);
    }
  };

  await deleteAll('medal_awards');
  await deleteAll('activity_results');
  await deleteAll('activities');
  await deleteAll('editions');
  await deleteAll('people');
}

interface InsertedEdition {
  id: string;
  year: number;
}

interface InsertedPerson {
  id: string;
  name: string;
}

interface InsertedActivity {
  id: string;
  name: string;
}

async function insertEditions(client: ServiceRoleClient, plan: ImportPlan): Promise<Map<string, string>> {
  const { data, error } = await client
    .from('editions')
    .insert(plan.editions.map((edition) => ({ year: edition.year })))
    .select('id,year');

  if (error) throw error;

  const rows = data as InsertedEdition[];
  const byYear = new Map(rows.map((row) => [row.year, row.id]));

  const jsonIdToUuid = new Map<string, string>();
  for (const edition of plan.editions) {
    const uuid = byYear.get(edition.year);
    if (!uuid) {
      throw new Error(`No se encontró el uuid insertado para la edición del año ${edition.year}.`);
    }
    jsonIdToUuid.set(edition.jsonId, uuid);
  }
  return jsonIdToUuid;
}

async function insertPeople(client: ServiceRoleClient, plan: ImportPlan): Promise<Map<string, string>> {
  const { data, error } = await client
    .from('people')
    .insert(plan.people.map((person) => ({ name: person.name })))
    .select('id,name');

  if (error) throw error;

  const rows = data as InsertedPerson[];
  const byName = new Map(rows.map((row) => [row.name, row.id]));

  const jsonIdToUuid = new Map<string, string>();
  for (const person of plan.people) {
    const uuid = byName.get(person.name);
    if (!uuid) {
      throw new Error(`No se encontró el uuid insertado para la persona "${person.name}".`);
    }
    jsonIdToUuid.set(person.jsonId, uuid);
  }
  return jsonIdToUuid;
}

async function insertActivities(client: ServiceRoleClient, plan: ImportPlan): Promise<Map<string, string>> {
  const { data, error } = await client
    .from('activities')
    .insert(plan.activities.map((activity) => ({ name: activity.name })))
    .select('id,name');

  if (error) throw error;

  const rows = data as InsertedActivity[];
  const byNameLower = new Map(rows.map((row) => [row.name.toLowerCase(), row.id]));

  const canonicalKeyToUuid = new Map<string, string>();
  for (const activity of plan.activities) {
    const uuid = byNameLower.get(activity.name.toLowerCase());
    if (!uuid) {
      // No debería ocurrir si R3.1-R3.4 se aplicaron antes de insertar (R3.6).
      throw new Error(
        `No se encontró el uuid insertado para la Activity "${activity.name}" (clave "${activity.canonicalKey}").`
      );
    }
    canonicalKeyToUuid.set(activity.canonicalKey, uuid);
  }
  return canonicalKeyToUuid;
}

interface ImportTotals {
  created: number;
}

/**
 * Inserta cada `ActivityResult` del plan y sus `MedalAward`, uno a uno (para
 * poder traducir cada `jsonId` a su `id` de Supabase antes de insertar sus
 * medallas), traduciendo `editionJsonId`/`activityCanonicalKey`/
 * `participantJsonIds`/`personJsonIds` a uuids con los mapas construidos
 * antes.
 */
async function insertResults(
  client: ServiceRoleClient,
  plan: ImportPlan,
  editionUuidByJsonId: Map<string, string>,
  activityUuidByCanonicalKey: Map<string, string>,
  personUuidByJsonId: Map<string, string>
): Promise<ImportTotals> {
  let created = 0;

  for (const result of plan.results) {
    const editionId = editionUuidByJsonId.get(result.editionJsonId);
    const activityId = activityUuidByCanonicalKey.get(result.activityCanonicalKey);
    if (!editionId || !activityId) {
      throw new Error(`importHistorico: no se pudo resolver edición/actividad para el resultado "${result.jsonId}".`);
    }

    const participantIds = result.participantJsonIds.map((jsonId) => {
      const uuid = personUuidByJsonId.get(jsonId);
      if (!uuid) {
        throw new Error(`importHistorico: personId desconocido "${jsonId}" en el resultado "${result.jsonId}".`);
      }
      return uuid;
    });

    const { data: insertedResult, error: insertResultError } = await client
      .from('activity_results')
      .insert({
        edition_id: editionId,
        activity_id: activityId,
        participant_ids: participantIds,
        played_at: null,
        notes: null,
        created_by_user_id: null,
      })
      .select('id')
      .single();

    if (insertResultError) throw insertResultError;

    const resultId = (insertedResult as { id: string }).id;

    if (result.medalAwards.length > 0) {
      const { error: insertAwardsError } = await client.from('medal_awards').insert(
        result.medalAwards.map((award) => ({
          result_id: resultId,
          medal: award.medal,
          person_ids: award.personJsonIds.map((jsonId) => {
            const uuid = personUuidByJsonId.get(jsonId);
            if (!uuid) {
              throw new Error(
                `importHistorico: personId desconocido "${jsonId}" en un medalAward del resultado "${result.jsonId}".`
              );
            }
            return uuid;
          }),
        }))
      );

      if (insertAwardsError) throw insertAwardsError;
    }

    created += 1;
  }

  return { created };
}

/** Totales de medallas por persona (uuid), calculados a partir del plan (esperados). */
function computeExpectedTotals(plan: ImportPlan, personUuidByJsonId: Map<string, string>): Map<string, Record<Medal, number>> {
  const totals = new Map<string, Record<Medal, number>>();
  const ensure = (personUuid: string) => {
    if (!totals.has(personUuid)) {
      totals.set(personUuid, { gold: 0, silver: 0, bronze: 0 });
    }
    return totals.get(personUuid) as Record<Medal, number>;
  };

  for (const result of plan.results) {
    for (const award of result.medalAwards) {
      for (const personJsonId of award.personJsonIds) {
        const personUuid = personUuidByJsonId.get(personJsonId);
        if (!personUuid) continue;
        ensure(personUuid)[award.medal] += 1;
      }
    }
  }
  return totals;
}

/**
 * Trae todas las filas de `medal_awards`, paginando con `.range()` (R6.1):
 * PostgREST recorta cada `select` a un máximo de 1000 filas por defecto, y
 * esta tabla puede superarlo ampliamente (varios awards por resultado, 995
 * resultados). Sin paginar, la verificación da falsos negativos.
 */
async function fetchAllMedalAwards(client: ServiceRoleClient): Promise<{ medal: Medal; person_ids: string[] }[]> {
  const { count, error: countError } = await client
    .from('medal_awards')
    .select('id', { count: 'exact', head: true });
  if (countError) throw countError;

  const total = count ?? 0;
  const pageSize = 1000;
  const rows: { medal: Medal; person_ids: string[] }[] = [];

  for (let from = 0; from < total; from += pageSize) {
    const to = Math.min(from + pageSize - 1, total - 1);
    const { data, error } = await client.from('medal_awards').select('medal,person_ids').range(from, to);
    if (error) throw error;
    rows.push(...(data as { medal: Medal; person_ids: string[] }[]));
  }

  return rows;
}

/** Verificación post-carga (R6.1): reagrega lo insertado en Supabase y lo compara con el plan. */
async function verifyTotals(client: ServiceRoleClient, expected: Map<string, Record<Medal, number>>): Promise<boolean> {
  const rows = await fetchAllMedalAwards(client);

  const actual = new Map<string, Record<Medal, number>>();
  const ensure = (personUuid: string) => {
    if (!actual.has(personUuid)) {
      actual.set(personUuid, { gold: 0, silver: 0, bronze: 0 });
    }
    return actual.get(personUuid) as Record<Medal, number>;
  };

  for (const row of rows) {
    for (const personUuid of row.person_ids) {
      ensure(personUuid)[row.medal] += 1;
    }
  }

  let matches = true;
  for (const [personUuid, expectedCounts] of expected.entries()) {
    const actualCounts = actual.get(personUuid) ?? { gold: 0, silver: 0, bronze: 0 };
    if (
      actualCounts.gold !== expectedCounts.gold ||
      actualCounts.silver !== expectedCounts.silver ||
      actualCounts.bronze !== expectedCounts.bronze
    ) {
      matches = false;
      console.warn(
        `Discrepancia de totales para persona ${personUuid}: esperado ${JSON.stringify(
          expectedCounts
        )}, insertado ${JSON.stringify(actualCounts)}.`
      );
    }
  }
  return matches;
}

async function main(): Promise<void> {
  const reset = process.argv.includes('--reset');

  const client = createServiceRoleClient();

  console.log('Leyendo data/historico-medallas.json...');
  const source = readSourceJson();
  const plan = buildImportPlan(source);

  console.log(
    `Plan construido: ${plan.editions.length} ediciones, ${plan.people.length} personas, ` +
      `${plan.activities.length} actividades, ${plan.results.length} resultados, ${plan.skipped.length} omitidos.`
  );

  await assertSafeToImport(client, reset);

  if (reset) {
    console.log('Modo --reset: borrando datos de dominio existentes...');
    await resetDomainData(client);
  }

  console.log('Insertando ediciones...');
  const editionUuidByJsonId = await insertEditions(client, plan);

  console.log('Insertando personas...');
  const personUuidByJsonId = await insertPeople(client, plan);

  console.log('Insertando actividades...');
  const activityUuidByCanonicalKey = await insertActivities(client, plan);

  console.log(`Insertando ${plan.results.length} resultados y sus medallas...`);
  const { created } = await insertResults(
    client,
    plan,
    editionUuidByJsonId,
    activityUuidByCanonicalKey,
    personUuidByJsonId
  );

  console.log('Verificando totales de medallas por persona (R6.1)...');
  const expectedTotals = computeExpectedTotals(plan, personUuidByJsonId);
  const matches = await verifyTotals(client, expectedTotals);

  console.log('--- Resumen de importación ---');
  console.log(`Ediciones creadas: ${editionUuidByJsonId.size}`);
  console.log(`Personas creadas: ${personUuidByJsonId.size}`);
  console.log(`Actividades creadas: ${activityUuidByCanonicalKey.size}`);
  console.log(`Resultados creados: ${created}`);
  console.log(`Filas omitidas: ${plan.skipped.length} (${plan.skipped.map((s) => s.jsonId).join(', ')})`);
  console.log(matches ? 'Totales de medallas verificados: OK.' : 'AVISO: hay discrepancias en los totales de medallas.');
}

main().catch((error) => {
  console.error('Import histórico abortado:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
