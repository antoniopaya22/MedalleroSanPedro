const mockActivityResultsSelect = jest.fn();
const mockActivityResultsEq = jest.fn();
const mockAwardsSelect = jest.fn();
const mockAwardsIn = jest.fn();
const mockPeopleSelect = jest.fn();
const mockActivitiesOrder = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { listEditionHistory } from '@/services/activityResults';

describe('src/services/activityResults listEditionHistory', () => {
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
      if (table === 'activities') {
        return { select: jest.fn().mockReturnValue({ order: mockActivitiesOrder }) };
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

    mockActivitiesOrder.mockResolvedValue({
      data: [
        { id: 'a1', name: 'Natación', created_at: '2026-01-01' },
        { id: 'a2', name: 'Ciclismo', created_at: '2026-01-01' },
      ],
      error: null,
    });
  });

  it('filtra activity_results por edition_id', async () => {
    mockActivityResultsEq.mockResolvedValue({
      data: [{ id: 'r1', activity_id: 'a1', participant_ids: ['p1', 'p2'], played_at: '2026-07-01' }],
      error: null,
    });
    mockAwardsIn.mockResolvedValue({ data: [], error: null });

    await listEditionHistory('e1');

    expect(mockActivityResultsSelect).toHaveBeenCalledWith('id,activity_id,participant_ids,played_at');
    expect(mockActivityResultsEq).toHaveBeenCalledWith('edition_id', 'e1');
    expect(mockAwardsIn).toHaveBeenCalledWith('result_id', ['r1']);
  });

  it('resuelve nombre de actividad, participantes y medallas oro/plata/bronce con nombres de ganadores', async () => {
    mockActivityResultsEq.mockResolvedValue({
      data: [{ id: 'r1', activity_id: 'a1', participant_ids: ['p1', 'p2'], played_at: '2026-07-01' }],
      error: null,
    });
    mockAwardsIn.mockResolvedValue({
      data: [
        { result_id: 'r1', medal: 'silver', person_ids: ['p2'] },
        { result_id: 'r1', medal: 'gold', person_ids: ['p1'] },
      ],
      error: null,
    });

    const history = await listEditionHistory('e1');

    expect(history).toEqual([
      {
        resultId: 'r1',
        activityId: 'a1',
        activityName: 'Natación',
        playedAt: '2026-07-01',
        participantCount: 2,
        medals: [
          { medal: 'gold', personNames: ['Ana'] },
          { medal: 'silver', personNames: ['Bea'] },
        ],
      },
    ]);
  });

  it('ordena por played_at descendente con los nulos al final', async () => {
    mockActivityResultsEq.mockResolvedValue({
      data: [
        { id: 'r-null', activity_id: 'a1', participant_ids: ['p1'], played_at: null },
        { id: 'r-recent', activity_id: 'a2', participant_ids: ['p1'], played_at: '2026-07-05' },
        { id: 'r-earlier', activity_id: 'a1', participant_ids: ['p1'], played_at: '2026-07-01' },
      ],
      error: null,
    });
    mockAwardsIn.mockResolvedValue({ data: [], error: null });

    const history = await listEditionHistory('e1');

    expect(history.map((entry) => entry.resultId)).toEqual(['r-recent', 'r-earlier', 'r-null']);
  });

  it('sin pruebas registradas devuelve lista vacía y no consulta medal_awards ni people ni activities', async () => {
    mockActivityResultsEq.mockResolvedValue({ data: [], error: null });

    await expect(listEditionHistory('e1')).resolves.toEqual([]);
    expect(mockAwardsIn).not.toHaveBeenCalled();
    expect(mockPeopleSelect).not.toHaveBeenCalled();
    expect(mockActivitiesOrder).not.toHaveBeenCalled();
  });
});
