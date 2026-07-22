import { Redirect } from 'expo-router';

/**
 * El home plano se sustituyó por la navegación por pestañas (f-014). `/`
 * sigue siendo un destino válido para los `router.replace('/')` existentes
 * (salida de `/welcome`, `/claim-person` y `/results/new` tras guardar);
 * aterriza en la pestaña Ediciones, la primera declarada en `(tabs)/_layout.tsx`.
 */
export default function Index() {
  return <Redirect href="/editions" />;
}
