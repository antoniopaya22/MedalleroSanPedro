import * as fs from 'fs';
import * as path from 'path';

import { buildImportPlan } from '@/scripts/historico/buildImportPlan';
import type { HistoricoJson } from '@/scripts/historico/types';
import type { Medal } from '@/types/domain';

const source: HistoricoJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'data', 'historico-medallas.json'), 'utf8')
);

describe('buildImportPlan — data/historico-medallas.json', () => {
  const plan = buildImportPlan(source);

  it('produce 17 ediciones (2009-2025) y 21 personas', () => {
    expect(plan.editions).toHaveLength(17);
    expect(plan.editions.map((e) => e.year).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 17 }, (_, i) => 2009 + i)
    );
    expect(plan.people).toHaveLength(21);
  });

  it('deduplica actividades: ninguna clave canónica aparece dos veces', () => {
    const keys = plan.activities.map((a) => a.canonicalKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('colapsa las variantes de los ejemplos de aceptación a una única Activity con el nombre correcto', () => {
    const byName = new Map(plan.activities.map((a) => [a.name, a]));

    expect(byName.has('Frontón')).toBe(true);
    expect(byName.get('Frontón')?.rawVariants.sort()).toEqual(['Fronton', 'fronton', 'frontón', 'Frontón'].sort());

    expect(byName.has('Fútbol')).toBe(true);
    expect(byName.get('Fútbol')?.rawVariants.sort()).toEqual(['Futbol', 'Fútbol'].sort());

    expect(byName.has('Catán')).toBe(true);
    expect(byName.get('Catán')?.rawVariants.sort()).toEqual(['catán', 'Catán'].sort());

    expect(byName.has('Call of Duty')).toBe(true);
    expect(byName.get('Call of Duty')?.rawVariants.sort()).toEqual(
      ['call of duty', 'Call of duty', 'Call of Duty'].sort()
    );

    expect(byName.has('Lanzamiento de disco')).toBe(true);
    expect(byName.get('Lanzamiento de disco')?.rawVariants.sort()).toEqual(
      ['Lanzamiento de disco', 'Lazamiento de disco'].sort()
    );

    expect(byName.has('Petanca')).toBe(true);
    expect(byName.get('Petanca')?.rawVariants).toContain('Petnca');

    // Ninguna otra Activity debería llamarse "Frontón parejas" fusionada con "Frontón":
    // son pruebas distintas (R3.5), deben seguir siendo entradas separadas.
    const frontonRelatedNames = plan.activities
      .map((a) => a.name)
      .filter((name) => /^front/i.test(name));
    expect(frontonRelatedNames).toEqual(expect.arrayContaining(['Frontón']));
    expect(frontonRelatedNames.length).toBeGreaterThan(1);
  });

  it('produce 995 resultados en el plan y 1 en skipped (el artefacto 2021-054)', () => {
    expect(plan.results).toHaveLength(995);
    expect(plan.skipped).toHaveLength(1);
    expect(plan.skipped[0].jsonId).toBe('2021-054');
  });

  it('fidelidad de participación: participantJsonIds incluye ganadores y participantes sin medalla', () => {
    // 2009-001: Tiro con pistola de agua — jorge oro, david y sergio plata (empate).
    const knownResult = plan.results.find((r) => r.jsonId === '2009-001');
    expect(knownResult).toBeDefined();
    expect(knownResult?.participantJsonIds.sort()).toEqual(['david', 'jorge', 'sergio'].sort());
    expect(knownResult?.medalAwards).toEqual(
      expect.arrayContaining([
        { medal: 'gold', personJsonIds: ['jorge'] },
        { medal: 'silver', personJsonIds: ['david', 'sergio'] },
      ])
    );
    // sin bronce en esta prueba
    expect(knownResult?.medalAwards.find((a) => a.medal === 'bronze')).toBeUndefined();

    // Busca una prueba real con al menos un participante con medal: null, para
    // comprobar que queda en participantJsonIds sin generar medalAward (R5.1).
    const editionsWithNullMedal = source.editions.flatMap((edition) =>
      edition.activityResults
        .filter((r) => r.participants.length > 0 && r.participants.some((p) => p.medal === null))
        .map((r) => r.id)
    );
    expect(editionsWithNullMedal.length).toBeGreaterThan(0);

    const sampleJsonId = editionsWithNullMedal[0];
    const rawSample = source.editions
      .flatMap((e) => e.activityResults)
      .find((r) => r.id === sampleJsonId)!;
    const plannedSample = plan.results.find((r) => r.jsonId === sampleJsonId)!;

    const noMedalPersonIds = rawSample.participants.filter((p) => p.medal === null).map((p) => p.personId);
    for (const personId of noMedalPersonIds) {
      expect(plannedSample.participantJsonIds).toContain(personId);
      const inAnyAward = plannedSample.medalAwards.some((award) => award.personJsonIds.includes(personId));
      expect(inAnyAward).toBe(false);
    }
  });

  it('R6.1 — totales de medallas por persona coinciden con la suma directa del JSON (hoja RESULTADOS)', () => {
    // Recomputo independiente desde el JSON de origen (no reutiliza buildImportPlan).
    const totalsFromSource = new Map<string, Record<Medal, number>>();
    const ensure = (personId: string) => {
      if (!totalsFromSource.has(personId)) {
        totalsFromSource.set(personId, { gold: 0, silver: 0, bronze: 0 });
      }
      return totalsFromSource.get(personId)!;
    };

    for (const edition of source.editions) {
      for (const result of edition.activityResults) {
        for (const participant of result.participants) {
          if (participant.medal) {
            ensure(participant.personId)[participant.medal] += 1;
          }
        }
      }
    }

    // Agregación equivalente desde el plan producido (lo que se insertaría).
    const totalsFromPlan = new Map<string, Record<Medal, number>>();
    const ensurePlan = (personId: string) => {
      if (!totalsFromPlan.has(personId)) {
        totalsFromPlan.set(personId, { gold: 0, silver: 0, bronze: 0 });
      }
      return totalsFromPlan.get(personId)!;
    };

    for (const result of plan.results) {
      for (const award of result.medalAwards) {
        for (const personId of award.personJsonIds) {
          ensurePlan(personId)[award.medal] += 1;
        }
      }
    }

    expect(Object.fromEntries(totalsFromPlan)).toEqual(Object.fromEntries(totalsFromSource));

    // Tabla RESULTADOS congelada (design.md §8), como fixture de regresión.
    const expectedTotals: Record<string, { gold: number; silver: number; bronze: number; total: number }> = {
      abuelos: { gold: 2, silver: 0, bronze: 2, total: 4 },
      antonio: { gold: 20, silver: 13, bronze: 8, total: 41 },
      anuncia: { gold: 9, silver: 10, bronze: 8, total: 27 },
      camila: { gold: 3, silver: 6, bronze: 1, total: 10 },
      carlos: { gold: 79, silver: 98, bronze: 61, total: 238 },
      chema: { gold: 14, silver: 20, bronze: 4, total: 38 },
      dario: { gold: 132, silver: 137, bronze: 101, total: 370 },
      david: { gold: 283, silver: 201, bronze: 93, total: 577 },
      hana: { gold: 9, silver: 8, bronze: 5, total: 22 },
      ines: { gold: 19, silver: 15, bronze: 16, total: 50 },
      jorge: { gold: 116, silver: 87, bronze: 91, total: 294 },
      laura: { gold: 116, silver: 90, bronze: 65, total: 271 },
      lucia: { gold: 18, silver: 15, bronze: 9, total: 42 },
      maite: { gold: 5, silver: 8, bronze: 2, total: 15 },
      nuria: { gold: 96, silver: 112, bronze: 84, total: 292 },
      pedro: { gold: 55, silver: 35, bronze: 19, total: 109 },
      poli: { gold: 81, silver: 88, bronze: 56, total: 225 },
      roberto: { gold: 1, silver: 1, bronze: 1, total: 3 },
      sara: { gold: 139, silver: 128, bronze: 81, total: 348 },
      sergio: { gold: 347, silver: 225, bronze: 129, total: 701 },
    };

    for (const [personId, expected] of Object.entries(expectedTotals)) {
      const actual = totalsFromPlan.get(personId);
      expect(actual).toBeDefined();
      expect(actual?.gold).toBe(expected.gold);
      expect(actual?.silver).toBe(expected.silver);
      expect(actual?.bronze).toBe(expected.bronze);
      expect((actual?.gold ?? 0) + (actual?.silver ?? 0) + (actual?.bronze ?? 0)).toBe(expected.total);
    }
  });
});
