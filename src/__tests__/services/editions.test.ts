const mockOrder = jest.fn();
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

import { createEdition, EditionYearTakenError, listEditions, updateEdition } from '@/services/editions';

describe('src/services/editions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Encadenamiento de lectura: .from('editions').select('*').order('year', {...}).
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockSelect.mockReturnValue({ order: mockOrder });

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

  describe('listEditions', () => {
    it('lista todas las ediciones ordenadas por año descendente', async () => {
      mockOrder.mockResolvedValue({
        data: [
          { id: '1', year: 2025, label: 'XXV edición', start_date: '2025-06-01', end_date: '2025-06-10', created_at: '2024-01-01' },
          { id: '2', year: 2024, label: null, start_date: null, end_date: null, created_at: '2023-01-01' },
        ],
        error: null,
      });

      const result = await listEditions();

      expect(mockFrom).toHaveBeenCalledWith('editions');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('year', { ascending: false });
      expect(result).toEqual([
        { id: '1', year: 2025, label: 'XXV edición', startDate: '2025-06-01', endDate: '2025-06-10', createdAt: '2024-01-01' },
        { id: '2', year: 2024, label: null, startDate: null, endDate: null, createdAt: '2023-01-01' },
      ]);
    });

    it('lanza si supabase devuelve error', async () => {
      mockOrder.mockResolvedValue({ data: null, error: new Error('fallo de red') });

      await expect(listEditions()).rejects.toThrow('fallo de red');
    });
  });

  describe('createEdition', () => {
    it('inserta year y normaliza label/fechas vacías a null', async () => {
      mockSingle.mockResolvedValue({
        data: { id: '3', year: 2026, label: null, start_date: null, end_date: null, created_at: '2026-01-01' },
        error: null,
      });

      const result = await createEdition({ year: 2026, label: '  ', startDate: '', endDate: undefined });

      expect(mockFrom).toHaveBeenCalledWith('editions');
      expect(mockInsert).toHaveBeenCalledWith({ year: 2026, label: null, start_date: null, end_date: null });
      expect(mockMutationSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual({
        id: '3',
        year: 2026,
        label: null,
        startDate: null,
        endDate: null,
        createdAt: '2026-01-01',
      });
    });

    it('recorta label y persiste fechas cuando se indican', async () => {
      mockSingle.mockResolvedValue({
        data: { id: '4', year: 2027, label: 'XXVII', start_date: '2027-06-01', end_date: '2027-06-05', created_at: '2027-01-01' },
        error: null,
      });

      await createEdition({ year: 2027, label: '  XXVII  ', startDate: '2027-06-01', endDate: '2027-06-05' });

      expect(mockInsert).toHaveBeenCalledWith({
        year: 2027,
        label: 'XXVII',
        start_date: '2027-06-01',
        end_date: '2027-06-05',
      });
    });

    it('traduce el error de año duplicado (código 23505) a EditionYearTakenError', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });

      await expect(createEdition({ year: 2025 })).rejects.toBeInstanceOf(EditionYearTakenError);
    });

    it('propaga otros errores tal cual', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: '42501', message: 'no autorizado' } });

      await expect(createEdition({ year: 2025 })).rejects.toMatchObject({ code: '42501' });
    });
  });

  describe('updateEdition', () => {
    it('envía solo las claves presentes en changes', async () => {
      mockSingle.mockResolvedValue({
        data: { id: '1', year: 2025, label: 'Nueva etiqueta', start_date: null, end_date: null, created_at: '2024-01-01' },
        error: null,
      });

      const result = await updateEdition('1', { label: 'Nueva etiqueta' });

      expect(mockUpdate).toHaveBeenCalledWith({ label: 'Nueva etiqueta' });
      expect(mockEq).toHaveBeenCalledWith('id', '1');
      expect(mockMutationSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual({
        id: '1',
        year: 2025,
        label: 'Nueva etiqueta',
        startDate: null,
        endDate: null,
        createdAt: '2024-01-01',
      });
    });

    it('con { year } envía solo year', async () => {
      mockSingle.mockResolvedValue({
        data: { id: '1', year: 2030, label: null, start_date: null, end_date: null, created_at: '2024-01-01' },
        error: null,
      });

      await updateEdition('1', { year: 2030 });

      expect(mockUpdate).toHaveBeenCalledWith({ year: 2030 });
    });

    it('traduce el error de año duplicado (código 23505) a EditionYearTakenError', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });

      await expect(updateEdition('1', { year: 2025 })).rejects.toBeInstanceOf(EditionYearTakenError);
    });

    it('propaga otros errores tal cual', async () => {
      mockSingle.mockResolvedValue({ data: null, error: new Error('fallo de red') });

      await expect(updateEdition('1', { label: 'x' })).rejects.toThrow('fallo de red');
    });
  });
});
