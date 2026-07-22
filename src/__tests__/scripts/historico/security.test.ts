import * as fs from 'fs';
import * as path from 'path';

/**
 * R7.3: la service role key y el cliente Supabase con privilegios elevados
 * sólo se referencian dentro de `src/scripts/` (el script de importación),
 * nunca desde `src/app/`, `src/components/`, `src/services/` ni ningún otro
 * código que se empaquete en la app móvil.
 */

const SRC_ROOT = path.join(__dirname, '..', '..', '..');
const EXCLUDED_DIR_NAMES = new Set(['scripts', '__tests__']);
const FORBIDDEN_PATTERNS = [/SUPABASE_SERVICE_ROLE_KEY/, /service_role/i];

function listFilesRecursive(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIR_NAMES.has(entry.name)) {
        continue;
      }
      files.push(...listFilesRecursive(path.join(dir, entry.name)));
    } else if (entry.isFile()) {
      files.push(path.join(dir, entry.name));
    }
  }

  return files;
}

describe('seguridad de credenciales (R7.3)', () => {
  it('SUPABASE_SERVICE_ROLE_KEY / service_role no aparecen fuera de src/scripts/ ni src/__tests__/', () => {
    const files = listFilesRecursive(SRC_ROOT);
    const offenders: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          offenders.push(`${file} (patrón ${pattern})`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('importHistorico.ts no importa el cliente React Native de src/services/supabase', () => {
    const importHistoricoPath = path.join(SRC_ROOT, 'scripts', 'historico', 'importHistorico.ts');
    const content = fs.readFileSync(importHistoricoPath, 'utf8');

    expect(content).not.toMatch(/@\/services\/supabase/);
    expect(content).not.toMatch(/from ['"]\.\.\/\.\.\/services\/supabase['"]/);
  });

  it('importHistorico.ts sí referencia la service role key (vive dentro de src/scripts/)', () => {
    const importHistoricoPath = path.join(SRC_ROOT, 'scripts', 'historico', 'importHistorico.ts');
    const content = fs.readFileSync(importHistoricoPath, 'utf8');

    expect(content).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
