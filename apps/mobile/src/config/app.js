// Configuración general de la app móvil.
// Las claves reales van en el archivo .env (ver .env.example) y nunca se suben a GitHub.
export const config = {
  modoDemo: true, // true = usa datos de ejemplo (data/mock.js)
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};
