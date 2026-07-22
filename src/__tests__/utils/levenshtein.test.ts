import { levenshteinDistance } from '@/utils/levenshtein';

describe('levenshteinDistance', () => {
  it('es 0 para strings iguales', () => {
    expect(levenshteinDistance('ajedrez', 'ajedrez')).toBe(0);
  });

  it('cuenta la longitud del otro string cuando uno está vacío', () => {
    expect(levenshteinDistance('', 'ajedrez')).toBe(7);
    expect(levenshteinDistance('ajedrez', '')).toBe(7);
  });

  it('detecta un error tipográfico de una letra', () => {
    expect(levenshteinDistance('ajedres', 'ajedrez')).toBe(1);
  });

  it('detecta errores tipográficos del histórico (f-008)', () => {
    expect(levenshteinDistance('lazamiento de disco', 'lanzamiento de disco')).toBe(1);
    expect(levenshteinDistance('petnca', 'petanca')).toBe(1);
  });

  it('no confunde nombres genuinamente distintos', () => {
    expect(levenshteinDistance('futbol', 'baloncesto')).toBeGreaterThan(3);
  });
});
