const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @supabase/functions-js (transitive dep de @supabase/supabase-js) no resuelve bien
// bajo la resolución estricta de "exports" que Metro activa por defecto: su "module"
// field apunta a un archivo real, pero Metro lo trata como si no existiera. Desactivar
// unstable_enablePackageExports vuelve a la resolución clásica main/module, que sí funciona.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
