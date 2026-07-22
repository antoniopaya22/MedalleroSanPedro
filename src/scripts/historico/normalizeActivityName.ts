/**
 * Normalización y deduplicación de nombres de actividad crudos del histórico
 * (R3). Código puro, sin I/O: se usa desde `buildImportPlan.ts` y se testea en
 * `src/__tests__/scripts/historico/normalizeActivityName.test.ts`.
 *
 * Estrategia deliberadamente conservadora (R3.5): sólo se fusionan variantes
 * de mayúsculas/tildes/espacios (`canonicalKey`) y errores tipográficos
 * inequívocos del mismo nombre (`ALIAS_MAP`). Nunca se fusionan sub-variantes
 * semánticas (p. ej. "Frontón" vs "Frontón parejas" vs "Frontón infantil"):
 * un curado exhaustivo de las ~494 variantes crudas es un ejercicio de datos
 * posterior, no un bloqueante de esta migración (ver design.md §9).
 */

/**
 * Clave canónica determinista de un nombre de actividad crudo: recorta
 * espacios, colapsa espacios internos, elimina diacríticos (tildes) y pasa a
 * minúsculas. Ej.: `"Frontón "` -> `"fronton"`, `"  Fútbol"` -> `"futbol"`.
 */
export function canonicalKey(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Mapa de alias curado: errores ortográficos inequívocos del **mismo**
 * nombre, nunca sub-variantes semánticas distintas (R3.2/R3.5).
 *
 * Clave = clave canónica de la variante errónea; valor = clave canónica de
 * destino. Los casos de sólo mayúsculas/tildes/espacios NO necesitan alias:
 * los resuelve `canonicalKey` directamente (p. ej. `fronton`/`Frontón`,
 * `Futbol`/`Fútbol`, `catán`/`Catán`, `call of duty`/`Call of Duty`,
 * `Badminton`/`Bádminton`).
 */
export const ALIAS_MAP: Record<string, string> = {
  'lazamiento de disco': 'lanzamiento de disco',
  petnca: 'petanca',
  sprin: 'sprint',
  kingdomio: 'kingdomino',
  // "Cricket" y "Criquet" son el mismo deporte con dos grafías distintas en
  // el histórico; se unifican en "criquet" (grafía mayoritaria, ver
  // DISPLAY_OVERRIDES).
  cricket: 'criquet',
};

/** Aplica `ALIAS_MAP` sobre la clave canónica para obtener la clave de destino. */
export function resolveKey(raw: string): string {
  const key = canonicalKey(raw);
  return ALIAS_MAP[key] ?? key;
}

/**
 * Nombre de presentación curado por clave canónica, para los casos en los que
 * la heurística de `preferredDisplayName` podría no bastar (p. ej. porque la
 * variante más frecuente en el origen no lleva tilde). Clave = clave
 * canónica de destino (post `resolveKey`).
 */
export const DISPLAY_OVERRIDES: Record<string, string> = {
  fronton: 'Frontón',
  futbol: 'Fútbol',
  catan: 'Catán',
  'call of duty': 'Call of Duty',
  criquet: 'Criquet',
  'lanzamiento de disco': 'Lanzamiento de disco',
  petanca: 'Petanca',
  sprint: 'Sprint',
  kingdomino: 'Kingdomino',
};

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function containsDiacritics(value: string): boolean {
  return stripDiacritics(value) !== value;
}

function isAllLowerCase(value: string): boolean {
  return value === value.toLowerCase();
}

/**
 * Elige el nombre de presentación de una `Activity` deduplicada: usa
 * `DISPLAY_OVERRIDES` si existe una entrada curada; si no, la variante cruda
 * más frecuente entre `rawVariants`, desempatando por (1) contiene
 * diacríticos, (2) no es todo minúsculas, (3) mayor longitud, (4) orden
 * alfabético — así `Frontón` gana a `fronton`.
 */
export function preferredDisplayName(canonicalKeyValue: string, rawVariants: string[]): string {
  const override = DISPLAY_OVERRIDES[canonicalKeyValue];
  if (override) {
    return override;
  }

  if (rawVariants.length === 0) {
    throw new Error(`preferredDisplayName: no raw variants provided for key "${canonicalKeyValue}"`);
  }

  const counts = new Map<string, number>();
  for (const raw of rawVariants) {
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }

  const candidates = Array.from(counts.entries());
  candidates.sort(([nameA, countA], [nameB, countB]) => {
    if (countA !== countB) {
      return countB - countA;
    }

    const diacriticsA = containsDiacritics(nameA);
    const diacriticsB = containsDiacritics(nameB);
    if (diacriticsA !== diacriticsB) {
      return diacriticsA ? -1 : 1;
    }

    const lowerA = isAllLowerCase(nameA);
    const lowerB = isAllLowerCase(nameB);
    if (lowerA !== lowerB) {
      return lowerA ? 1 : -1;
    }

    if (nameA.length !== nameB.length) {
      return nameB.length - nameA.length;
    }

    return nameA.localeCompare(nameB);
  });

  return candidates[0][0];
}
