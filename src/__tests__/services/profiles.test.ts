const mockMaybeSingle = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { fetchMyProfile } from '@/services/profiles';

describe('src/services/profiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Encadenamiento .from('profiles').select('*').eq(...).maybeSingle()
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  describe('fetchMyProfile', () => {
    it('mapea correctamente snake_case a camelCase cuando hay fila', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockMaybeSingle.mockResolvedValue({
        data: {
          user_id: 'user-1',
          email: 'ana@example.com',
          person_id: 'person-1',
          created_at: '2024-01-01',
        },
        error: null,
      });

      const result = await fetchMyProfile();

      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(result).toEqual({
        userId: 'user-1',
        email: 'ana@example.com',
        personId: 'person-1',
        createdAt: '2024-01-01',
      });
    });

    it('devuelve null cuando no hay sesión', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await fetchMyProfile();

      expect(result).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('devuelve null cuando no hay fila', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await fetchMyProfile();

      expect(result).toBeNull();
    });

    it('lanza si supabase devuelve error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockMaybeSingle.mockResolvedValue({ data: null, error: new Error('fallo de red') });

      await expect(fetchMyProfile()).rejects.toThrow('fallo de red');
    });
  });
});
