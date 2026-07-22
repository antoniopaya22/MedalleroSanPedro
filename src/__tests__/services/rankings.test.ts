const mockOrder = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();
const mockFrom = jest.fn();
const mockActivityResultsSelect = jest.fn();
const mockAwardsSelect = jest.fn();
const mockPeopleRange = jest.fn();
const mockResultsRange = jest.fn();
const mockAwardsRange = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockListEditions = jest.fn();
jest.mock('@/services/editions', () => ({
  listEditions: (...args: unknown[]) => mockListEditions(...args),
}));

import {
  buildPersonActivityBreakdown,
  buildPersonEditionBreakdown,
  listActivityRanking,
  listEditionRanking,
  listHistoricRanking,
  listPersonSummary,
  sortHistoricRanking,
  sortRanking,
  type ActivityRankingRow,
  type HistoricRankingRow,
} from '@/services/rankings';
import type { PersonHistoryEntry } from '@/services/activityResults';

describe('src/services/rankings', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Toda consulta termina en `.range(from, to)` (paginación por encima del
    // límite de 1000 filas de PostgREST, ver `fetchAllRows`): `.order(...)`,
    // `.eq(...)` e `.in(...)` son pasos intermedios opcionales que siempre
    // devuelven un objeto con `range` al final de la cadena.
    mockOrder.mockReturnValue({ range: mockPeopleRange });
    mockActivityResultsSelect.mockReturnValue({ eq: mockEq, range: mockResultsRange });
    mockEq.mockReturnValue({ range: mockResultsRange });
    mockAwardsSelect.mockReturnValue({ in: mockIn, range: mockAwardsRange });
    mockIn.mockReturnValue({ range: mockAwardsRange });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'people') {
        return { select: mockSelect.mockReturnValue({ order: mockOrder }) };
      }
      if (table === 'activity_results') {
        return { select: mockActivityResultsSelect };
      }
      if (table === 'medal_awards') {
        return { select: mockAwardsSelect };
      }
      return { select: jest.fn().mockReturnValue({ in: mockIn }) };
    });
  });

  it('agrega medallas, participaciones y promedio por edicion', async () => {
    mockPeopleRange.mockResolvedValue({
      data: [
        { id: 'p1', name: 'Ana' },
        { id: 'p2', name: 'Bea' },
        { id: 'p3', name: 'Cris' },
      ],
      error: null,
    });
    mockResultsRange.mockResolvedValue({
      data: [
        { id: 'r1', participant_ids: ['p1', 'p2'] },
        { id: 'r2', participant_ids: ['p1', 'p3'] },
      ],
      error: null,
    });
    mockAwardsRange.mockResolvedValue({
      data: [
        { result_id: 'r1', medal: 'gold', person_ids: ['p2'] },
        { result_id: 'r1', medal: 'silver', person_ids: ['p1'] },
        { result_id: 'r2', medal: 'bronze', person_ids: ['p1', 'p3'] },
      ],
      error: null,
    });

    const ranking = await listEditionRanking('e1');

    expect(mockFrom).toHaveBeenCalledWith('people');
    expect(mockSelect).toHaveBeenCalledWith('id,name');
    expect(mockOrder).toHaveBeenCalledWith('name');
    expect(mockEq).toHaveBeenCalledWith('edition_id', 'e1');
    expect(mockIn).toHaveBeenCalledWith('result_id', ['r1', 'r2']);
    expect(ranking).toEqual([
      {
        personId: 'p2',
        personName: 'Bea',
        gold: 1,
        silver: 0,
        bronze: 0,
        total: 1,
        score: 3,
        participations: 1,
        scorePerParticipation: 3,
      },
      {
        personId: 'p1',
        personName: 'Ana',
        gold: 0,
        silver: 1,
        bronze: 1,
        total: 2,
        score: 3,
        participations: 2,
        scorePerParticipation: 1.5,
      },
      {
        personId: 'p3',
        personName: 'Cris',
        gold: 0,
        silver: 0,
        bronze: 1,
        total: 1,
        score: 1,
        participations: 1,
        scorePerParticipation: 1,
      },
    ]);
  });

  it('incluye participantes sin medalla con promedio cero', async () => {
    mockPeopleRange.mockResolvedValue({ data: [{ id: 'p1', name: 'Ana' }], error: null });
    mockResultsRange.mockResolvedValue({ data: [{ id: 'r1', participant_ids: ['p1'] }], error: null });
    mockAwardsRange.mockResolvedValue({ data: [], error: null });

    await expect(listEditionRanking('e1')).resolves.toEqual([
      {
        personId: 'p1',
        personName: 'Ana',
        gold: 0,
        silver: 0,
        bronze: 0,
        total: 0,
        score: 0,
        participations: 1,
        scorePerParticipation: 0,
      },
    ]);
  });

  it('con edicion sin pruebas devuelve ranking vacio y no consulta medal_awards', async () => {
    mockPeopleRange.mockResolvedValue({ data: [{ id: 'p1', name: 'Ana' }], error: null });
    mockResultsRange.mockResolvedValue({ data: [], error: null });

    await expect(listEditionRanking('e1')).resolves.toEqual([]);
    expect(mockIn).not.toHaveBeenCalled();
  });

  it('pagina medal_awards por encima de las 1000 filas que devuelve una sola pagina de Supabase', async () => {
    // Reproduce el bug real: con 995 activity_results y >1000 medal_awards,
    // una consulta sin paginar perdía en silencio los premios de la segunda
    // página (jugadores que sí tenían medallas aparecían con 0).
    const page1 = Array.from({ length: 1000 }, (_, i) => ({
      result_id: 'r1',
      medal: 'bronze' as const,
      person_ids: [`filler-${i}`],
    }));
    const page2 = [{ result_id: 'r1', medal: 'gold' as const, person_ids: ['p1'] }];

    mockPeopleRange.mockResolvedValue({ data: [{ id: 'p1', name: 'Ana' }], error: null });
    mockResultsRange.mockResolvedValue({ data: [{ id: 'r1', participant_ids: ['p1'] }], error: null });
    mockAwardsRange.mockResolvedValueOnce({ data: page1, error: null }).mockResolvedValueOnce({ data: page2, error: null });

    const ranking = await listEditionRanking('e1');

    expect(mockAwardsRange).toHaveBeenCalledTimes(2);
    expect(mockAwardsRange).toHaveBeenNthCalledWith(1, 0, 999);
    expect(mockAwardsRange).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(ranking).toEqual([
      {
        personId: 'p1',
        personName: 'Ana',
        gold: 1,
        silver: 0,
        bronze: 0,
        total: 1,
        score: 3,
        participations: 1,
        scorePerParticipation: 3,
      },
    ]);
  });

  describe('listHistoricRanking', () => {
    it('agrega medallas y participaciones de todas las ediciones sin filtrar por edition_id', async () => {
      mockPeopleRange.mockResolvedValue({
        data: [
          { id: 'p1', name: 'Ana' },
          { id: 'p2', name: 'Bea' },
        ],
        error: null,
      });
      mockResultsRange.mockResolvedValue({
        data: [
          { id: 'r1', participant_ids: ['p1', 'p2'] },
          { id: 'r2', participant_ids: ['p1'] },
        ],
        error: null,
      });
      mockAwardsRange.mockResolvedValue({
        data: [
          { result_id: 'r1', medal: 'gold', person_ids: ['p1'] },
          { result_id: 'r2', medal: 'silver', person_ids: ['p1'] },
        ],
        error: null,
      });

      const ranking = await listHistoricRanking();

      expect(mockActivityResultsSelect).toHaveBeenCalledWith('id,participant_ids,edition_id');
      expect(mockEq).not.toHaveBeenCalled();
      expect(mockAwardsSelect).toHaveBeenCalledWith('result_id,medal,person_ids');
      expect(mockIn).not.toHaveBeenCalled();
      expect(ranking).toEqual([
        {
          personId: 'p1',
          personName: 'Ana',
          gold: 1,
          silver: 1,
          bronze: 0,
          total: 2,
          score: 5,
          participations: 2,
          scorePerParticipation: 2.5,
        },
        {
          personId: 'p2',
          personName: 'Bea',
          gold: 0,
          silver: 0,
          bronze: 0,
          total: 0,
          score: 0,
          participations: 1,
          scorePerParticipation: 0,
        },
      ]);
    });

    describe('con yearRange (f-021)', () => {
      const PEOPLE_DATA = [{ id: 'p1', name: 'Ana' }];
      const EDITIONS = [
        { id: 'e2020', year: 2020, label: null, start_date: null, end_date: null, created_at: '2020-01-01' },
        { id: 'e2023', year: 2023, label: null, start_date: null, end_date: null, created_at: '2023-01-01' },
        { id: 'e2025', year: 2025, label: null, start_date: null, end_date: null, created_at: '2025-01-01' },
      ];
      const RESULTS_DATA = [
        { id: 'r2020', participant_ids: ['p1'], edition_id: 'e2020' },
        { id: 'r2023', participant_ids: ['p1'], edition_id: 'e2023' },
        { id: 'r2025', participant_ids: ['p1'], edition_id: 'e2025' },
      ];
      const AWARDS_DATA = [
        { result_id: 'r2020', medal: 'bronze', person_ids: ['p1'] },
        { result_id: 'r2023', medal: 'silver', person_ids: ['p1'] },
        { result_id: 'r2025', medal: 'gold', person_ids: ['p1'] },
      ];

      beforeEach(() => {
        mockPeopleRange.mockResolvedValue({ data: PEOPLE_DATA, error: null });
        mockResultsRange.mockResolvedValue({ data: RESULTS_DATA, error: null });
        mockAwardsRange.mockResolvedValue({ data: AWARDS_DATA, error: null });
        mockListEditions.mockResolvedValue(EDITIONS.map((e) => ({ id: e.id, year: e.year, label: e.label })));
      });

      it('acota puntos y participaciones a las ediciones dentro del rango de años', async () => {
        const ranking = await listHistoricRanking({ fromYear: 2021, toYear: 2025 });

        // Solo e2023 (plata=2) y e2025 (oro=3) caen en [2021,2025]; e2020 (bronce) queda fuera.
        expect(ranking).toEqual([
          {
            personId: 'p1',
            personName: 'Ana',
            gold: 1,
            silver: 1,
            bronze: 0,
            total: 2,
            score: 5,
            participations: 2,
            scorePerParticipation: 2.5,
          },
        ]);
      });

      it('sin ninguna edición dentro del rango devuelve ranking vacío (R1.4)', async () => {
        await expect(listHistoricRanking({ fromYear: 2100, toYear: 2200 })).resolves.toEqual([]);
      });

      it('sin yearRange no filtra (se comporta como antes)', async () => {
        const ranking = await listHistoricRanking();

        expect(ranking).toEqual([
          {
            personId: 'p1',
            personName: 'Ana',
            gold: 1,
            silver: 1,
            bronze: 1,
            total: 3,
            score: 6,
            participations: 3,
            scorePerParticipation: 2,
          },
        ]);
        expect(mockListEditions).not.toHaveBeenCalled();
      });
    });

    it('incluye participacion sin medalla con promedio cero', async () => {
      mockPeopleRange.mockResolvedValue({ data: [{ id: 'p1', name: 'Ana' }], error: null });
      mockResultsRange.mockResolvedValue({ data: [{ id: 'r1', participant_ids: ['p1'] }], error: null });
      mockAwardsRange.mockResolvedValue({ data: [], error: null });

      await expect(listHistoricRanking()).resolves.toEqual([
        {
          personId: 'p1',
          personName: 'Ana',
          gold: 0,
          silver: 0,
          bronze: 0,
          total: 0,
          score: 0,
          participations: 1,
          scorePerParticipation: 0,
        },
      ]);
    });

    it('sin resultados registrados consulta igualmente medal_awards sin filtrar (evita URL in(...) gigante)', async () => {
      mockPeopleRange.mockResolvedValue({ data: [{ id: 'p1', name: 'Ana' }], error: null });
      mockResultsRange.mockResolvedValue({ data: [], error: null });
      mockAwardsRange.mockResolvedValue({ data: [], error: null });

      await expect(listHistoricRanking()).resolves.toEqual([]);
      expect(mockIn).not.toHaveBeenCalled();
    });

    it('pagina activity_results y medal_awards cuando ambos superan las 1000 filas por pagina', async () => {
      const resultsPage1 = Array.from({ length: 1000 }, (_, i) => ({ id: `r${i}`, participant_ids: ['p1'] }));
      const resultsPage2 = [{ id: 'r-extra', participant_ids: ['p1'] }];

      mockPeopleRange.mockResolvedValue({ data: [{ id: 'p1', name: 'Ana' }], error: null });
      mockResultsRange
        .mockResolvedValueOnce({ data: resultsPage1, error: null })
        .mockResolvedValueOnce({ data: resultsPage2, error: null });
      mockAwardsRange.mockResolvedValue({ data: [{ result_id: 'r-extra', medal: 'silver', person_ids: ['p1'] }], error: null });

      const ranking = await listHistoricRanking();

      expect(mockResultsRange).toHaveBeenCalledTimes(2);
      expect(ranking).toEqual([
        {
          personId: 'p1',
          personName: 'Ana',
          gold: 0,
          silver: 1,
          bronze: 0,
          total: 1,
          score: 2,
          participations: 1001,
          scorePerParticipation: 2 / 1001,
        },
      ]);
    });
  });

  describe('listActivityRanking', () => {
    it('agrega medallas, participaciones y promedio de todas las ediciones filtrando por actividad', async () => {
      mockPeopleRange.mockResolvedValue({
        data: [
          { id: 'p1', name: 'Ana' },
          { id: 'p2', name: 'Bea' },
        ],
        error: null,
      });
      mockResultsRange.mockResolvedValue({
        data: [
          { id: 'r1', participant_ids: ['p1', 'p2'] },
          { id: 'r2', participant_ids: ['p1'] },
        ],
        error: null,
      });
      mockAwardsRange.mockResolvedValue({
        data: [
          { result_id: 'r1', medal: 'gold', person_ids: ['p1'] },
          { result_id: 'r2', medal: 'silver', person_ids: ['p1'] },
        ],
        error: null,
      });

      const ranking = await listActivityRanking('a1');

      expect(mockActivityResultsSelect).toHaveBeenCalledWith('id,participant_ids,edition_id');
      expect(mockEq).toHaveBeenCalledWith('activity_id', 'a1');
      expect(mockIn).toHaveBeenCalledWith('result_id', ['r1', 'r2']);
      expect(ranking).toEqual([
        {
          personId: 'p1',
          personName: 'Ana',
          gold: 1,
          silver: 1,
          bronze: 0,
          total: 2,
          score: 5,
          participations: 2,
          scorePerParticipation: 2.5,
        },
        {
          personId: 'p2',
          personName: 'Bea',
          gold: 0,
          silver: 0,
          bronze: 0,
          total: 0,
          score: 0,
          participations: 1,
          scorePerParticipation: 0,
        },
      ]);
    });

    it('incluye participacion sin medalla con promedio cero', async () => {
      mockPeopleRange.mockResolvedValue({ data: [{ id: 'p1', name: 'Ana' }], error: null });
      mockResultsRange.mockResolvedValue({ data: [{ id: 'r1', participant_ids: ['p1'] }], error: null });
      mockAwardsRange.mockResolvedValue({ data: [], error: null });

      const ranking: ActivityRankingRow[] = await listActivityRanking('a1');

      expect(ranking).toEqual([
        {
          personId: 'p1',
          personName: 'Ana',
          gold: 0,
          silver: 0,
          bronze: 0,
          total: 0,
          score: 0,
          participations: 1,
          scorePerParticipation: 0,
        },
      ]);
    });

    it('con actividad sin pruebas devuelve ranking vacio y no consulta medal_awards', async () => {
      mockPeopleRange.mockResolvedValue({ data: [{ id: 'p1', name: 'Ana' }], error: null });
      mockResultsRange.mockResolvedValue({ data: [], error: null });

      await expect(listActivityRanking('a1')).resolves.toEqual([]);
      expect(mockIn).not.toHaveBeenCalled();
    });
  });

  describe('listPersonSummary (f-017)', () => {
    it('devuelve la fila del historico de la persona cuando ha participado', async () => {
      mockPeopleRange.mockResolvedValue({
        data: [
          { id: 'p1', name: 'Ana' },
          { id: 'p2', name: 'Bea' },
        ],
        error: null,
      });
      mockResultsRange.mockResolvedValue({
        data: [{ id: 'r1', participant_ids: ['p1', 'p2'] }],
        error: null,
      });
      mockAwardsRange.mockResolvedValue({
        data: [{ result_id: 'r1', medal: 'gold', person_ids: ['p1'] }],
        error: null,
      });

      const summary = await listPersonSummary('p1');

      expect(summary).toEqual({
        personId: 'p1',
        personName: 'Ana',
        gold: 1,
        silver: 0,
        bronze: 0,
        total: 1,
        score: 3,
        participations: 1,
        scorePerParticipation: 3,
      });
    });

    it('devuelve null cuando la persona no ha participado en ninguna prueba', async () => {
      mockPeopleRange.mockResolvedValue({ data: [{ id: 'p1', name: 'Ana' }], error: null });
      mockResultsRange.mockResolvedValue({ data: [], error: null });
      mockAwardsRange.mockResolvedValue({ data: [], error: null });

      await expect(listPersonSummary('p1')).resolves.toBeNull();
    });
  });

  describe('buildPersonEditionBreakdown / buildPersonActivityBreakdown (f-018)', () => {
    function entry(overrides: Partial<PersonHistoryEntry>): PersonHistoryEntry {
      return {
        resultId: 'r1',
        editionId: 'e1',
        editionYear: 2024,
        editionLabel: null,
        activityId: 'a1',
        activityName: 'Catan',
        playedAt: null,
        medal: null,
        ...overrides,
      };
    }

    describe('buildPersonEditionBreakdown', () => {
      it('agrega puntos y promedio por edicion, mas antigua primero', () => {
        const history: PersonHistoryEntry[] = [
          entry({ resultId: 'r1', editionId: 'e2024', editionYear: 2024, editionLabel: 'Verano', medal: 'gold' }),
          entry({ resultId: 'r2', editionId: 'e2024', editionYear: 2024, editionLabel: 'Verano', medal: null }),
          entry({ resultId: 'r3', editionId: 'e2023', editionYear: 2023, editionLabel: null, medal: 'silver' }),
        ];

        expect(buildPersonEditionBreakdown(history)).toEqual([
          {
            editionId: 'e2023',
            editionYear: 2023,
            editionLabel: null,
            score: 2,
            participations: 1,
            scorePerParticipation: 2,
          },
          {
            editionId: 'e2024',
            editionYear: 2024,
            editionLabel: 'Verano',
            score: 3,
            participations: 2,
            scorePerParticipation: 1.5,
          },
        ]);
      });

      it('con historico vacio devuelve un array vacio', () => {
        expect(buildPersonEditionBreakdown([])).toEqual([]);
      });

      it('participacion sin medalla en una unica edicion da promedio cero, no rota', () => {
        const history: PersonHistoryEntry[] = [entry({ editionId: 'e1', editionYear: 2024, medal: null })];

        expect(buildPersonEditionBreakdown(history)).toEqual([
          {
            editionId: 'e1',
            editionYear: 2024,
            editionLabel: null,
            score: 0,
            participations: 1,
            scorePerParticipation: 0,
          },
        ]);
      });
    });

    describe('buildPersonActivityBreakdown', () => {
      it('agrega puntos y promedio por actividad, ordenado de mayor a menor promedio', () => {
        const history: PersonHistoryEntry[] = [
          entry({ resultId: 'r1', activityId: 'catan', activityName: 'Catan', medal: 'gold' }),
          entry({ resultId: 'r2', activityId: 'catan', activityName: 'Catan', medal: null }),
          entry({ resultId: 'r3', activityId: 'dardos', activityName: 'Dardos', medal: 'gold' }),
        ];

        expect(buildPersonActivityBreakdown(history)).toEqual([
          {
            activityId: 'dardos',
            activityName: 'Dardos',
            score: 3,
            participations: 1,
            scorePerParticipation: 3,
          },
          {
            activityId: 'catan',
            activityName: 'Catan',
            score: 3,
            participations: 2,
            scorePerParticipation: 1.5,
          },
        ]);
      });

      it('en empate de promedio desempata por puntos totales (aunque el nombre alfabetico sea al reves)', () => {
        const history: PersonHistoryEntry[] = [
          // 'zulu': 2 participaciones a oro (score 6, promedio 3).
          entry({ resultId: 'r1', activityId: 'zulu', activityName: 'Zulu', medal: 'gold' }),
          entry({ resultId: 'r2', activityId: 'zulu', activityName: 'Zulu', medal: 'gold' }),
          // 'ajedrez': 1 participacion a oro (score 3, promedio 3) — mismo promedio, menos puntos.
          entry({ resultId: 'r3', activityId: 'ajedrez', activityName: 'Ajedrez', medal: 'gold' }),
        ];

        expect(buildPersonActivityBreakdown(history).map((row) => row.activityId)).toEqual(['zulu', 'ajedrez']);
      });

      it('en empate de promedio y puntos, desempata por nombre alfabetico', () => {
        const history: PersonHistoryEntry[] = [
          entry({ resultId: 'r1', activityId: 'b', activityName: 'Bingo', medal: 'silver' }),
          entry({ resultId: 'r2', activityId: 'a', activityName: 'Ajedrez', medal: 'silver' }),
        ];

        expect(buildPersonActivityBreakdown(history).map((row) => row.activityId)).toEqual(['a', 'b']);
      });

      it('con historico vacio devuelve un array vacio', () => {
        expect(buildPersonActivityBreakdown([])).toEqual([]);
      });
    });
  });

  describe('sortRanking / sortHistoricRanking', () => {
    it('sortHistoricRanking sigue exportado como alias de sortRanking', () => {
      expect(sortHistoricRanking).toBe(sortRanking);
    });

    const rows: HistoricRankingRow[] = [
      {
        personId: 'p1',
        personName: 'Ana',
        gold: 3,
        silver: 0,
        bronze: 0,
        total: 3,
        score: 9,
        participations: 10,
        scorePerParticipation: 0.9,
      },
      {
        personId: 'p2',
        personName: 'Bea',
        gold: 1,
        silver: 0,
        bronze: 0,
        total: 1,
        score: 3,
        participations: 1,
        scorePerParticipation: 3,
      },
    ];

    it('en modo "medals" ordena por oro/plata/bronce/total/promedio/nombre (mas medallas primero)', () => {
      const sorted = sortHistoricRanking(rows, 'medals');
      expect(sorted.map((row) => row.personId)).toEqual(['p1', 'p2']);
    });

    it('en modo "average" ordena por promedio de medallas por participacion (mas eficiente primero)', () => {
      const sorted = sortHistoricRanking(rows, 'average');
      expect(sorted.map((row) => row.personId)).toEqual(['p2', 'p1']);
    });

    it('no muta el array original', () => {
      const original = [...rows];
      sortHistoricRanking(rows, 'average');
      expect(rows).toEqual(original);
    });
  });
});
