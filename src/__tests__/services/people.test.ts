const mockIs = jest.fn();
const mockOrder = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockMutationSelect = jest.fn();
const mockInsert = jest.fn();
const mockEq = jest.fn();
const mockUpdate = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  claimPerson,
  createPerson,
  listClaimablePeople,
  listPeople,
  PersonAlreadyClaimedError,
  PersonNameTakenError,
  updatePerson,
} from '@/services/people';

describe('src/services/people', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Encadenamiento de lectura: .from('people').select('*').is(...).order(...)
    // y .from('people').select('*').order(...) (sin `is`, para `listPeople`).
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockIs.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ is: mockIs, order: mockOrder });

    // Encadenamiento de mutación: .insert(...).select('*').single() y
    // .update(...).eq('id', id).select('*').single().
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockMutationSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockMutationSelect });
    mockEq.mockReturnValue({ select: mockMutationSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    });
  });

  describe('listClaimablePeople', () => {
    it('filtra por claimed_by_user_id is null y ordena por nombre', async () => {
      mockOrder.mockResolvedValue({
        data: [
          { id: '1', name: 'Ana', active: true, claimed_by_user_id: null, created_at: '2024-01-01' },
          { id: '2', name: 'Beto', active: true, claimed_by_user_id: null, created_at: '2024-01-02' },
        ],
        error: null,
      });

      const result = await listClaimablePeople();

      expect(mockFrom).toHaveBeenCalledWith('people');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockIs).toHaveBeenCalledWith('claimed_by_user_id', null);
      expect(mockOrder).toHaveBeenCalledWith('name');
      expect(result).toEqual([
        { id: '1', name: 'Ana', active: true, claimedByUserId: null, createdAt: '2024-01-01' },
        { id: '2', name: 'Beto', active: true, claimedByUserId: null, createdAt: '2024-01-02' },
      ]);
    });

    it('lanza si supabase devuelve error', async () => {
      mockOrder.mockResolvedValue({ data: null, error: new Error('fallo de red') });

      await expect(listClaimablePeople()).rejects.toThrow('fallo de red');
    });
  });

  describe('claimPerson', () => {
    it('invoca la RPC claim_person con el id objetivo', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      await claimPerson('person-1');

      expect(mockRpc).toHaveBeenCalledWith('claim_person', { target_person_id: 'person-1' });
    });

    it('traduce el error de persona ya reclamada (código 23505) a PersonAlreadyClaimedError', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'Esa persona ya ha sido reclamada' } });

      await expect(claimPerson('person-1')).rejects.toBeInstanceOf(PersonAlreadyClaimedError);
    });

    it('propaga otros errores tal cual', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Debes iniciar sesión' } });

      await expect(claimPerson('person-1')).rejects.toMatchObject({ code: '42501' });
    });
  });

  describe('listPeople', () => {
    it('lista todo el roster (activas e inactivas) ordenado por nombre', async () => {
      mockOrder.mockResolvedValue({
        data: [
          { id: '1', name: 'Ana', active: true, claimed_by_user_id: 'user-1', created_at: '2024-01-01' },
          { id: '2', name: 'Zoe', active: false, claimed_by_user_id: null, created_at: '2024-01-02' },
        ],
        error: null,
      });

      const result = await listPeople();

      expect(mockFrom).toHaveBeenCalledWith('people');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockIs).not.toHaveBeenCalled();
      expect(mockOrder).toHaveBeenCalledWith('name');
      expect(result).toEqual([
        { id: '1', name: 'Ana', active: true, claimedByUserId: 'user-1', createdAt: '2024-01-01' },
        { id: '2', name: 'Zoe', active: false, claimedByUserId: null, createdAt: '2024-01-02' },
      ]);
    });

    it('lanza si supabase devuelve error', async () => {
      mockOrder.mockResolvedValue({ data: null, error: new Error('fallo de red') });

      await expect(listPeople()).rejects.toThrow('fallo de red');
    });
  });

  describe('createPerson', () => {
    it('inserta el nombre recortado, sin active ni claimed_by_user_id, y devuelve la Person mapeada', async () => {
      mockSingle.mockResolvedValue({
        data: { id: '3', name: 'Carla', active: true, claimed_by_user_id: null, created_at: '2024-01-03' },
        error: null,
      });

      const result = await createPerson('  Carla  ');

      expect(mockFrom).toHaveBeenCalledWith('people');
      expect(mockInsert).toHaveBeenCalledWith({ name: 'Carla' });
      expect(mockInsert).not.toHaveBeenCalledWith(expect.objectContaining({ active: expect.anything() }));
      expect(mockInsert).not.toHaveBeenCalledWith(expect.objectContaining({ claimed_by_user_id: expect.anything() }));
      expect(mockMutationSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual({ id: '3', name: 'Carla', active: true, claimedByUserId: null, createdAt: '2024-01-03' });
    });

    it('lanza si supabase devuelve error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: new Error('fallo de red') });

      await expect(createPerson('Carla')).rejects.toThrow('fallo de red');
    });

    it('traduce la violacion del indice unico (23505) a PersonNameTakenError (plan de mejoras, fase 1)', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });

      await expect(createPerson('Ana')).rejects.toBeInstanceOf(PersonNameTakenError);
    });
  });

  describe('updatePerson', () => {
    it('con { active } solo envía active (nunca claimed_by_user_id)', async () => {
      mockSingle.mockResolvedValue({
        data: { id: '1', name: 'Ana', active: false, claimed_by_user_id: 'user-1', created_at: '2024-01-01' },
        error: null,
      });

      const result = await updatePerson('1', { active: false });

      expect(mockUpdate).toHaveBeenCalledWith({ active: false });
      expect(mockEq).toHaveBeenCalledWith('id', '1');
      expect(mockMutationSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual({
        id: '1',
        name: 'Ana',
        active: false,
        claimedByUserId: 'user-1',
        createdAt: '2024-01-01',
      });
    });

    it('con { name } aplica trim y solo envía name', async () => {
      mockSingle.mockResolvedValue({
        data: { id: '1', name: 'Ana María', active: true, claimed_by_user_id: null, created_at: '2024-01-01' },
        error: null,
      });

      await updatePerson('1', { name: '  Ana María  ' });

      expect(mockUpdate).toHaveBeenCalledWith({ name: 'Ana María' });
    });

    it('lanza si supabase devuelve error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: new Error('fallo de red') });

      await expect(updatePerson('1', { active: true })).rejects.toThrow('fallo de red');
    });

    it('traduce la violacion del indice unico (23505) a PersonNameTakenError al renombrar (plan de mejoras, fase 1)', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });

      await expect(updatePerson('1', { name: 'Beto' })).rejects.toBeInstanceOf(PersonNameTakenError);
    });
  });
});
