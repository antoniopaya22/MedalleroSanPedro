const mockActivityResultsSelect = jest.fn();
const mockActivityResultsEq = jest.fn();
const mockAwardsSelect = jest.fn();
const mockAwardsIn = jest.fn();
const mockPeopleSelect = jest.fn();
const mockEditionsOrder = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { listActivityHistory } from '@/services/activityResults';

describe('src/services/activityResults listActivityHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockActivityResultsSelect.mockReturnValue({ eq: mockActivityResultsEq });
    mockAwardsSelect.mockReturnValue({ in: mockAwardsIn });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'activity_results') {
        return { select: mockActivityResultsSelect };
      }
      if (table === 'medal_awards') {
        return { select: mockAwardsSelect };
      }
      if (table === 'people') {
        return { select: mockPeopleSelect };
      }
      if (table === 'editions') {
        return { select: jest.fn().mockReturnValue({ order: mockEditionsOrder }) };
      }
      throw new Error(`unexpected table ${table}`);
    });

    mockPeopleSelect.mockReturnValue({
      data: [
        { id: 'p1', name: 'Ana' },
        { id: 'p2', name: 'Bea' },
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

  it('filtra activity_results por activity_id', async () => {
    mockActivityResultsEq.mockResolvedValue({
      data: [{ id: 'r1', edition_id: 'e1', participant_ids: ['p1', 'p2'], played_at: '2026-07-01' }],
      error: null,
    });
    mockAwardsIn.mockResolvedValue({ data: [], error: null });

    await listActivityHistory('a1');

    expect(mockActivityResultsSelect).toHaveBeenCalledWith('id,edition_id,participant_ids,played_at');
    expect(mockActivityResultsEq).toHaveBeenCalledWith('activity_id', 'a1');
    expect(mockAwardsIn).toHaveBeenCalledWith('result_id', ['r1']);
  });

  it('resuelve edición, participantes y medallas oro/plata/bronce con nombres de ganadores', async () => {
    mockActivityResultsEq.mockResolvedValue({
      data: [{ id: 'r1', edition_id: 'e1', participant_ids: ['p1', 'p2'], played_at: '2026-07-01' }],
      error: null,
    });
    mockAwardsIn.mockResolvedValue({
      data: [
        { result_id: 'r1', medal: 'silver', person_ids: ['p2'] },
        { result_id: 'r1', medal: 'gold', person_ids: ['p1'] },
      ],
      error: null,
    });

    const history = await listActivityHistory('a1');

    expect(history).toEqual([
      {
        resultId: 'r1',
        editionId: 'e1',
        editionYear: 2026,
        editionLabel: 'Verano',
        playedAt: '2026-07-01',
        participantCount: 2,
        medals: [
          { medal: 'gold', personNames: ['Ana'] },
          { medal: 'silver', personNames: ['Bea'] },
        ],
      },
    ]);
  });

  it('ordena de la edición más reciente a la más antigua y, dentro del mismo año, de la prueba más reciente', async () => {
    mockActivityResultsEq.mockResolvedValue({
      data: [
        { id: 'r-old', edition_id: 'e2', participant_ids: ['p1'], played_at: null },
        { id: 'r-recent', edition_id: 'e1', participant_ids: ['p1'], played_at: '2026-07-05' },
        { id: 'r-recent-earlier', edition_id: 'e1', participant_ids: ['p1'], played_at: '2026-07-01' },
      ],
      error: null,
    });
    mockAwardsIn.mockResolvedValue({ data: [], error: null });

    const history = await listActivityHistory('a1');

    expect(history.map((entry) => entry.resultId)).toEqual(['r-recent', 'r-recent-earlier', 'r-old']);
  });

  it('sin pruebas registradas devuelve lista vacía y no consulta medal_awards ni people ni editions', async () => {
    mockActivityResultsEq.mockResolvedValue({ data: [], error: null });

    await expect(listActivityHistory('a1')).resolves.toEqual([]);
    expect(mockAwardsIn).not.toHaveBeenCalled();
    expect(mockPeopleSelect).not.toHaveBeenCalled();
    expect(mockEditionsOrder).not.toHaveBeenCalled();
  });
});
