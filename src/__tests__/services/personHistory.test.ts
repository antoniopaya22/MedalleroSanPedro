const mockActivityResultsSelect = jest.fn();
const mockActivityResultsContains = jest.fn();
const mockAwardsSelect = jest.fn();
const mockAwardsContains = jest.fn();
const mockActivitiesOrder = jest.fn();
const mockEditionsOrder = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { listPersonHistory } from '@/services/activityResults';

describe('src/services/activityResults listPersonHistory (f-017)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockActivityResultsSelect.mockReturnValue({ contains: mockActivityResultsContains });
    mockAwardsSelect.mockReturnValue({ contains: mockAwardsContains });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'activity_results') {
        return { select: mockActivityResultsSelect };
      }
      if (table === 'medal_awards') {
        return { select: mockAwardsSelect };
      }
      if (table === 'activities') {
        return { select: jest.fn().mockReturnValue({ order: mockActivitiesOrder }) };
      }
      if (table === 'editions') {
        return { select: jest.fn().mockReturnValue({ order: mockEditionsOrder }) };
      }
      throw new Error(`unexpected table ${table}`);
    });

    mockActivitiesOrder.mockResolvedValue({
      data: [
        { id: 'a1', name: 'Natación', created_at: '2026-01-01' },
        { id: 'a2', name: 'Fútbol', created_at: '2026-01-01' },
      ],
      error: null,
    });

    mockEditionsOrder.mockResolvedValue({
      data: [
        { id: 'e1', year: 2026, label: 'Verano', start_date: null, end_date: null, created_at: '2026-01-01' },
        { id: 'e2', year: 2025, label: null, start_date: null, end_date: null, created_at: '2025-01-01' },
      ],
      error: null,
    });
  });

  it('filtra activity_results por pertenencia de la persona a participant_ids, y medal_awards por person_ids (no por lista de result_id)', async () => {
    mockActivityResultsContains.mockResolvedValue({
      data: [{ id: 'r1', edition_id: 'e1', activity_id: 'a1', played_at: '2026-07-01' }],
      error: null,
    });
    mockAwardsContains.mockResolvedValue({ data: [], error: null });

    await listPersonHistory('p1');

    expect(mockActivityResultsSelect).toHaveBeenCalledWith('id,edition_id,activity_id,played_at');
    expect(mockActivityResultsContains).toHaveBeenCalledWith('participant_ids', ['p1']);
    // Filtrar por person_ids (no por `.in('result_id', ids)`) evita que la URL
    // se dispare con alguien que tenga cientos de participaciones (mismo bug
    // ya corregido en rankings.ts para el ranking histórico).
    expect(mockAwardsContains).toHaveBeenCalledWith('person_ids', ['p1']);
  });

  it('resuelve la medalla propia de la persona en cada prueba', async () => {
    mockActivityResultsContains.mockResolvedValue({
      data: [{ id: 'r1', edition_id: 'e1', activity_id: 'a1', played_at: '2026-07-01' }],
      error: null,
    });
    mockAwardsContains.mockResolvedValue({
      data: [{ result_id: 'r1', medal: 'gold', person_ids: ['p1'] }],
      error: null,
    });

    const history = await listPersonHistory('p1');

    expect(history).toEqual([
      {
        resultId: 'r1',
        editionId: 'e1',
        editionYear: 2026,
        editionLabel: 'Verano',
        activityId: 'a1',
        activityName: 'Natación',
        playedAt: '2026-07-01',
        medal: 'gold',
      },
    ]);
  });

  it('marca la prueba como "sin medalla" cuando la persona participo pero no gano ninguna', async () => {
    mockActivityResultsContains.mockResolvedValue({
      data: [{ id: 'r1', edition_id: 'e1', activity_id: 'a1', played_at: '2026-07-01' }],
      error: null,
    });
    mockAwardsContains.mockResolvedValue({ data: [], error: null });

    const history = await listPersonHistory('p1');

    expect(history[0].medal).toBeNull();
  });

  it('sin pruebas registradas devuelve lista vacia y no consulta medal_awards ni activities ni editions', async () => {
    mockActivityResultsContains.mockResolvedValue({ data: [], error: null });

    await expect(listPersonHistory('p1')).resolves.toEqual([]);
    expect(mockAwardsContains).not.toHaveBeenCalled();
    expect(mockActivitiesOrder).not.toHaveBeenCalled();
    expect(mockEditionsOrder).not.toHaveBeenCalled();
  });

  it('ordena de la edicion mas reciente a la mas antigua y, dentro del mismo ano, de la prueba mas reciente', async () => {
    mockActivityResultsContains.mockResolvedValue({
      data: [
        { id: 'r-old', edition_id: 'e2', activity_id: 'a1', played_at: null },
        { id: 'r-recent', edition_id: 'e1', activity_id: 'a1', played_at: '2026-07-05' },
        { id: 'r-recent-earlier', edition_id: 'e1', activity_id: 'a2', played_at: '2026-07-01' },
      ],
      error: null,
    });
    mockAwardsContains.mockResolvedValue({ data: [], error: null });

    const history = await listPersonHistory('p1');

    expect(history.map((entry) => entry.resultId)).toEqual(['r-recent', 'r-recent-earlier', 'r-old']);
  });
});
