import appJson from '../../app.json';

// Configuración general de la app móvil.
// Las claves reales van en el archivo .env (ver .env.example) y nunca se suben a GitHub.
export const config = {
  modoDemo: true, // true = usa datos de ejemplo (data/mock.js)
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

// Versión de la app: se toma sola de app.json ("version"); al publicar una versión nueva solo se cambia allí
export const VERSION_APP = appJson.expo.version;

// Pie del menú lateral
export const CREDITOS = {
  autor: 'Xavier Rúa Domínguez',
  ciudad: 'Medellín, Colombia',
  correo: 'xavier.rua@gmail.com',
};
