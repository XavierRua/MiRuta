// Configuración general del panel web.
// Las claves reales van en el archivo .env (ver .env.example) y nunca se suben a GitHub.
export const config = {
  modoDemo: true, // true = usa datos de ejemplo (data/mock.js)
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
};
