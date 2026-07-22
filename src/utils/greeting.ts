/**
 * Utilidad trivial para el bootstrap del proyecto: sirve como ejemplo de
 * módulo puro importado vía el alias `@/utils/greeting` y para verificar
 * jest-expo + alias en los tests (ver `src/__tests__/utils/greeting.test.ts`).
 */
export function getGreeting(name?: string): string {
  if (name && name.trim().length > 0) {
    return `Bienvenido, ${name.trim()}`;
  }
  return "Bienvenido a MedalleroSanPedro";
}
