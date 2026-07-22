/** Distancia de edición (Levenshtein) entre dos strings, código puro. */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  const previousRow = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    let previousDiagonal = previousRow[0];
    previousRow[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const temp = previousRow[j];
      previousRow[j] =
        a[i - 1] === b[j - 1] ? previousDiagonal : 1 + Math.min(previousDiagonal, previousRow[j], previousRow[j - 1]);
      previousDiagonal = temp;
    }
  }

  return previousRow[b.length];
}
