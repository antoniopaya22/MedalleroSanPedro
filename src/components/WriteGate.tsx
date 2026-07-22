import type { ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';

export interface WriteGateProps {
  children: ReactNode;
  /** Qué renderizar cuando el usuario no puede escribir. Por defecto: nada. */
  fallback?: ReactNode;
}

/**
 * Muestra sus hijos (controles de escritura) solo si el usuario puede escribir
 * (`canWrite`: autenticado y con `Person` reclamada). Para todos los demás
 * (anónimo o autenticado sin `Person`) renderiza `fallback` (por defecto null).
 * Es gating de UI (defensa en profundidad); la garantía real es RLS.
 */
export function WriteGate({ children, fallback = null }: WriteGateProps) {
  const { canWrite } = useAuth();
  return <>{canWrite ? children : fallback}</>;
}
