import {
  ALIAS_MAP,
  canonicalKey,
  preferredDisplayName,
  resolveKey,
} from '@/scripts/historico/normalizeActivityName';

describe('canonicalKey', () => {
  it('recorta espacios y colapsa espacios internos', () => {
    expect(canonicalKey('  Fútbol  ')).toBe('futbol');
    expect(canonicalKey('Call   of    Duty')).toBe('call of duty');
  });

  it('elimina diacríticos y pasa a minúsculas', () => {
    expect(canonicalKey('Frontón')).toBe('fronton');
    expect(canonicalKey('fronton')).toBe('fronton');
    expect(canonicalKey('Frontón ')).toBe('fronton');
    expect(canonicalKey('frontón')).toBe('fronton');
    expect(canonicalKey('Catán')).toBe('catan');
    expect(canonicalKey('catán')).toBe('catan');
    expect(canonicalKey('Fútbol')).toBe('futbol');
    expect(canonicalKey('Futbol')).toBe('futbol');
    expect(canonicalKey('Call of Duty')).toBe('call of duty');
    expect(canonicalKey('call of duty')).toBe('call of duty');
    expect(canonicalKey('Call of duty')).toBe('call of duty');
    expect(canonicalKey('Badminton')).toBe('badminton');
    expect(canonicalKey('Bádminton')).toBe('badminton');
  });

  it('produce la misma clave para variantes que sólo difieren en caja/tilde/espacio', () => {
    const variants = ['fronton', 'Fronton', 'frontón', 'Frontón', ' Frontón '];
    const keys = new Set(variants.map(canonicalKey));
    expect(keys.size).toBe(1);
    expect([...keys][0]).toBe('fronton');
  });
});

describe('resolveKey (ALIAS_MAP)', () => {
  it('resuelve typos inequívocos del mismo nombre al destino curado', () => {
    expect(resolveKey('Lazamiento de disco')).toBe('lanzamiento de disco');
    expect(resolveKey('Petnca')).toBe('petanca');
    expect(resolveKey('Sprin')).toBe('sprint');
    expect(resolveKey('Kingdomio')).toBe('kingdomino');
    expect(resolveKey('Cricket')).toBe('criquet');
    expect(resolveKey('Criquet')).toBe('criquet');
  });

  it('no altera nombres que no tienen alias', () => {
    expect(resolveKey('Petanca')).toBe('petanca');
    expect(resolveKey('Frontón')).toBe('fronton');
  });

  it('el mapa de alias tiene como valor una clave canónica válida (idempotente)', () => {
    for (const target of Object.values(ALIAS_MAP)) {
      expect(canonicalKey(target)).toBe(target);
    }
  });

  it('unifica Cricket y Criquet a la misma clave de destino', () => {
    expect(resolveKey('Cricket')).toBe(resolveKey('Criquet'));
  });
});

describe('preferredDisplayName', () => {
  it('usa el override curado cuando existe', () => {
    expect(preferredDisplayName('fronton', ['fronton', 'Fronton', 'Frontón'])).toBe('Frontón');
    expect(preferredDisplayName('futbol', ['Futbol', 'Fútbol'])).toBe('Fútbol');
    expect(preferredDisplayName('catan', ['catán', 'Catán'])).toBe('Catán');
    expect(preferredDisplayName('call of duty', ['call of duty', 'Call of duty', 'Call of Duty'])).toBe(
      'Call of Duty'
    );
    expect(preferredDisplayName('lanzamiento de disco', ['Lazamiento de disco', 'Lanzamiento de disco'])).toBe(
      'Lanzamiento de disco'
    );
    expect(preferredDisplayName('petanca', ['Petnca', 'Petanca'])).toBe('Petanca');
  });

  it('sin override, elige la variante más frecuente', () => {
    expect(preferredDisplayName('badminton', ['Badminton', 'Badminton', 'Bádminton'])).toBe('Badminton');
  });

  it('sin override y con empate de frecuencia, prioriza diacríticos y luego mayúsculas', () => {
    expect(preferredDisplayName('sin-override-test', ['algo raro', 'Algo Raro'])).toBe('Algo Raro');
  });

  it('lanza si no hay variantes crudas', () => {
    expect(() => preferredDisplayName('vacio', [])).toThrow();
  });
});
