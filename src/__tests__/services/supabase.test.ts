const ENV_URL = 'EXPO_PUBLIC_SUPABASE_URL';
const ENV_ANON_KEY = 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

const originalEnv = { ...process.env };

function setEnv(url: string | undefined, anonKey: string | undefined): void {
  if (url === undefined) {
    delete process.env[ENV_URL];
  } else {
    process.env[ENV_URL] = url;
  }
  if (anonKey === undefined) {
    delete process.env[ENV_ANON_KEY];
  } else {
    process.env[ENV_ANON_KEY] = anonKey;
  }
}

// No dependemos de red real: mockeamos createClient para que el test se
// centre exclusivamente en la lógica de lectura de variables de entorno.
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ mocked: true })),
}));

describe('src/services/supabase', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('exporta un cliente definido cuando las variables de entorno están presentes', () => {
    setEnv('https://example.supabase.co', 'anon-key-de-prueba');
    jest.resetModules();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../services/supabase');

    expect(mod.supabase).toBeDefined();
  });

  it('lanza un error claro que nombra la variable si falta EXPO_PUBLIC_SUPABASE_URL', () => {
    setEnv(undefined, 'anon-key-de-prueba');
    jest.resetModules();

    expect(() => require('../../services/supabase')).toThrow(
      /EXPO_PUBLIC_SUPABASE_URL/
    );
  });

  it('lanza un error claro que nombra la variable si falta EXPO_PUBLIC_SUPABASE_ANON_KEY', () => {
    setEnv('https://example.supabase.co', undefined);
    jest.resetModules();

    expect(() => require('../../services/supabase')).toThrow(
      /EXPO_PUBLIC_SUPABASE_ANON_KEY/
    );
  });

  // Nota: la verificación de "sin URL de Supabase literal en el código" se
  // hace por revisión (ver design.md, caso opcional) en vez de leer el
  // fuente con `fs`, para no requerir @types/node en el tsconfig del
  // proyecto (fuera del alcance de f-010).
});
