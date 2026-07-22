const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  ActivityResultValidationError,
  createActivityResult,
  deleteActivityResult,
  getActivityResultDetail,
  updateActivityResult,
} from '@/services/activityResults';

describe('src/services/activityResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: {
        id: 'r1',
        edition_id: 'e1',
        activity_id: 'a1',
        participant_ids: ['p1', 'p2'],
        played_at: null,
        notes: null,
        created_by_user_id: 'u1',
        created_at: '2026-07-20',
      },
      error: null,
    });
  });

  it('crea una prueba mediante la RPC atomica y mapea el resultado', async () => {
    const result = await createActivityResult({
      editionId: 'e1',
      activityId: 'a1',
      participantIds: ['p1', 'p2'],
      playedAt: ' 2026-07-20 ',
      notes: '  Final ajustada ',
      medalAwards: [{ medal: 'gold', personIds: ['p1', 'p2'] }],
    });

    expect(mockRpc).toHaveBeenCalledWith('create_activity_result_with_awards', {
      p_edition_id: 'e1',
      p_activity_id: 'a1',
      p_participant_ids: ['p1', 'p2'],
      p_played_at: '2026-07-20',
      p_notes: 'Final ajustada',
      p_medal_awards: [{ medal: 'gold', personIds: ['p1', 'p2'] }],
    });
    expect(result).toEqual({
      id: 'r1',
      editionId: 'e1',
      activityId: 'a1',
      participantIds: ['p1', 'p2'],
      playedAt: null,
      notes: null,
      createdByUserId: 'u1',
      createdAt: '2026-07-20',
    });
  });

  it('incluye automaticamente ganadores en participantIds antes de llamar a la RPC', async () => {
    await createActivityResult({
      editionId: 'e1',
      activityId: 'a1',
      participantIds: ['p1'],
      medalAwards: [{ medal: 'silver', personIds: ['p2'] }],
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'create_activity_result_with_awards',
      expect.objectContaining({ p_participant_ids: ['p1', 'p2'] })
    );
  });

  it('no llama al backend si faltan participantes', async () => {
    await expect(
      createActivityResult({
        editionId: 'e1',
        activityId: 'a1',
        participantIds: [],
        medalAwards: [{ medal: 'gold', personIds: ['p1'] }],
      })
    ).rejects.toBeInstanceOf(ActivityResultValidationError);

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('impide que una persona reciba dos medallas en la misma prueba', async () => {
    await expect(
      createActivityResult({
        editionId: 'e1',
        activityId: 'a1',
        participantIds: ['p1'],
        medalAwards: [
          { medal: 'gold', personIds: ['p1'] },
          { medal: 'bronze', personIds: ['p1'] },
        ],
      })
    ).rejects.toThrow('Una persona no puede recibir dos medallas en la misma prueba.');

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('propaga errores de Supabase', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'RLS' } });

    await expect(
      createActivityResult({
        editionId: 'e1',
        activityId: 'a1',
        participantIds: ['p1'],
        medalAwards: [{ medal: 'gold', personIds: ['p1'] }],
      })
    ).rejects.toMatchObject({ code: '42501' });
  });

  describe('updateActivityResult (plan de mejoras, fase 1)', () => {
    it('corrige una prueba mediante la RPC de edición atomica', async () => {
      const result = await updateActivityResult('r1', {
        editionId: 'e1',
        activityId: 'a1',
        participantIds: ['p1', 'p2'],
        medalAwards: [{ medal: 'gold', personIds: ['p1'] }],
      });

      expect(mockRpc).toHaveBeenCalledWith('update_activity_result_with_awards', {
        p_result_id: 'r1',
        p_edition_id: 'e1',
        p_activity_id: 'a1',
        p_participant_ids: ['p1', 'p2'],
        p_played_at: null,
        p_notes: null,
        p_medal_awards: [{ medal: 'gold', personIds: ['p1'] }],
      });
      expect(result.id).toBe('r1');
    });

    it('valida igual que al crear: no permite guardar sin medallas', async () => {
      await expect(
        updateActivityResult('r1', {
          editionId: 'e1',
          activityId: 'a1',
          participantIds: ['p1'],
          medalAwards: [],
        })
      ).rejects.toBeInstanceOf(ActivityResultValidationError);

      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('deleteActivityResult (plan de mejoras, fase 1)', () => {
    it('borra la fila por id', async () => {
      const eq = jest.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({ delete: () => ({ eq }) });

      await deleteActivityResult('r1');

      expect(mockFrom).toHaveBeenCalledWith('activity_results');
      expect(eq).toHaveBeenCalledWith('id', 'r1');
    });

    it('propaga errores de Supabase', async () => {
      const eq = jest.fn().mockResolvedValue({ error: { code: '42501', message: 'RLS' } });
      mockFrom.mockReturnValue({ delete: () => ({ eq }) });

      await expect(deleteActivityResult('r1')).rejects.toMatchObject({ code: '42501' });
    });
  });

  describe('getActivityResultDetail (plan de mejoras, fase 1)', () => {
    it('combina activity_results y medal_awards para precargar el asistente en modo edición', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'activity_results') {
          return {
            select: () => ({
              eq: () => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'r1',
                    edition_id: 'e1',
                    activity_id: 'a1',
                    participant_ids: ['p1', 'p2'],
                    played_at: '2026-07-20',
                    notes: 'Final ajustada',
                    created_by_user_id: 'u1',
                    created_at: '2026-07-20',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'medal_awards') {
          return {
            select: () => ({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { medal: 'gold', person_ids: ['p1'] },
                  { medal: 'silver', person_ids: ['p2'] },
                ],
                error: null,
              }),
            }),
          };
        }
        throw new Error(`tabla inesperada: ${table}`);
      });

      const detail = await getActivityResultDetail('r1');

      expect(detail).toEqual({
        editionId: 'e1',
        activityId: 'a1',
        participantIds: ['p1', 'p2'],
        playedAt: '2026-07-20',
        notes: 'Final ajustada',
        medalAwards: [
          { medal: 'gold', personIds: ['p1'] },
          { medal: 'silver', personIds: ['p2'] },
        ],
      });
    });
  });
});

