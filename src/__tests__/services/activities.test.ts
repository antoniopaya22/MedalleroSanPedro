const mockOrder = jest.fn();
const mockIlike = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockMutationSelect = jest.fn();
const mockInsert = jest.fn();
const mockEq = jest.fn();
const mockUpdate = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  ActivityNameTakenError,
  createActivity,
  listActivities,
  searchActivities,
  updateActivity,
} from '@/services/activities';

describe('src/services/activities', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Encadenamiento de lectura: .from('activities').select('*').order(...)
    // y .from('activities').select('*').ilike(...).order(...) (búsqueda).
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockIlike.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ order: mockOrder, ilike: mockIlike });

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

  describe('listActivities', () => {
    it('lista todo el catálogo ordenado por nombre', async () => {
      mockOrder.mockResolvedValue({
        data: [
          { id: '1', name: 'Ajedrez', created_at: '2024-01-01' },
          { id: '2', name: 'Fútbol', created_at: '2024-01-02' },
        ],
        error: null,
      });

      const result = await listActivities();

      expect(mockFrom).toHaveBeenCalledWith('activities');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('name');
      expect(mockIlike).not.toHaveBeenCalled();
      expect(result).toEqual([
        { id: '1', name: 'Ajedrez', createdAt: '2024-01-01' },
        { id: '2', name: 'Fútbol', createdAt: '2024-01-02' },
      ]);
    });

    it('lanza si supabase devuelve error', async () => {
      mockOrder.mockResolvedValue({ data: null, error: new Error('fallo de red') });

      await expect(listActivities()).rejects.toThrow('fallo de red');
    });
  });

  describe('searchActivities', () => {
    it('con un término no vacío filtra con ilike (case-insensitive) y ordena por nombre', async () => {
      mockOrder.mockResolvedValue({
        data: [{ id: '2', name: 'Fútbol', created_at: '2024-01-02' }],
        error: null,
      });

      const result = await searchActivities('fut');

      expect(mockFrom).toHaveBeenCalledWith('activities');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockIlike).toHaveBeenCalledWith('name', '%fut%');
      expect(mockOrder).toHaveBeenCalledWith('name');
      expect(result).toEqual([{ id: '2', name: 'Fútbol', createdAt: '2024-01-02' }]);
    });

    it('recorta espacios sobrantes del término antes de buscar', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      await searchActivities('  fut  ');

      expect(mockIlike).toHaveBeenCalledWith('name', '%fut%');
    });

    it('con término vacío o solo espacios delega en el camino de listActivities (sin ilike)', async () => {
      mockOrder.mockResolvedValue({
        data: [{ id: '1', name: 'Ajedrez', created_at: '2024-01-01' }],
        error: null,
      });

      const result = await searchActivities('   ');

      expect(mockIlike).not.toHaveBeenCalled();
      expect(mockOrder).toHaveBeenCalledWith('name');
      expect(result).toEqual([{ id: '1', name: 'Ajedrez', createdAt: '2024-01-01' }]);
    });

    it('lanza si supabase devuelve error', async () => {
      mockOrder.mockResolvedValue({ data: null, error: new Error('fallo de red') });

      await expect(searchActivities('fut')).rejects.toThrow('fallo de red');
    });
  });

  describe('createActivity', () => {
    it('inserta el nombre recortado y devuelve la Activity mapeada', async () => {
      mockSingle.mockResolvedValue({
        data: { id: '3', name: 'Petanca', created_at: '2024-01-03' },
        error: null,
      });

      const result = await createActivity('  Petanca  ');

      expect(mockFrom).toHaveBeenCalledWith('activities');
      expect(mockInsert).toHaveBeenCalledWith({ name: 'Petanca' });
      expect(mockMutationSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual({ id: '3', name: 'Petanca', createdAt: '2024-01-03' });
    });

    it('traduce el error de nombre duplicado (código 23505) a ActivityNameTakenError', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });

      await expect(createActivity('Fútbol')).rejects.toBeInstanceOf(ActivityNameTakenError);
    });

    it('propaga otros errores tal cual', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: '42501', message: 'no autorizado' } });

      await expect(createActivity('Fútbol')).rejects.toMatchObject({ code: '42501' });
    });
  });

  describe('updateActivity', () => {
    it('envía el nombre recortado y filtra por id, devolviendo la Activity mapeada', async () => {
      mockSingle.mockResolvedValue({
        data: { id: '1', name: 'Fútbol sala', created_at: '2024-01-01' },
        error: null,
      });

      const result = await updateActivity('1', '  Fútbol sala  ');

      expect(mockUpdate).toHaveBeenCalledWith({ name: 'Fútbol sala' });
      expect(mockEq).toHaveBeenCalledWith('id', '1');
      expect(mockMutationSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual({ id: '1', name: 'Fútbol sala', createdAt: '2024-01-01' });
    });

    it('traduce el error de nombre duplicado (código 23505) a ActivityNameTakenError', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });

      await expect(updateActivity('1', 'Fútbol')).rejects.toBeInstanceOf(ActivityNameTakenError);
    });

    it('propaga otros errores tal cual', async () => {
      mockSingle.mockResolvedValue({ data: null, error: new Error('fallo de red') });

      await expect(updateActivity('1', 'Fútbol')).rejects.toThrow('fallo de red');
    });
  });
});
