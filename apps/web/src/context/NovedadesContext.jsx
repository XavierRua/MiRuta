import { createContext, useContext, useState } from 'react';
import { FORMULARIOS_DEFECTO, normalizarPausas } from '../config/formularios';

const NovedadesContext = createContext(null);
const leer = (clave, defecto) => {
  try {
    return JSON.parse(localStorage.getItem(clave) ?? 'null') ?? defecto;
  } catch {
    return defecto;
  }
};
const escribir = (clave, valor) => {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // sin almacenamiento: queda solo mientras la página esté abierta
  }
};

// Configuración de formularios, GPS apagados manualmente y horas de reporte excluidas.
// En la demo se guarda en el navegador; con Supabase, en las tablas de la migración 0014.
export function NovedadesProvider({ children }) {
  const [formularios, setFormularios] = useState(() =>
    normalizarPausas({ ...FORMULARIOS_DEFECTO, ...normalizarPausas(leer('miruta.formularios', {})) }),
  );
  // Actividades autorizadas: habilitadas a un trabajador para una fecha (capacitación, reunión, cita médica…)
  const [actividades, setActividades] = useState(() => leer('miruta.actividades', null) ?? actividadesEjemplo());
  const [apagados, setApagados] = useState(() => leer('miruta.apagados', []));
  const [exclusiones, setExclusiones] = useState(() => leer('miruta.exclusiones', []));

  const guardarFormularios = (f) => {
    setFormularios(f);
    escribir('miruta.formularios', f);
  };
  // Guarda solo una parte (p. ej. las pausas) sin tocar lo demás: cada parte tiene su propio permiso
  const guardarParte = (cambio) => guardarFormularios({ ...formularios, ...cambio });
  // Apagar el GPS de un trabajador: comentario obligatorio; queda quién, cuándo y por qué
  const apagarGps = (registro) => {
    const nuevos = [{ id: `ap-${Date.now()}`, hora: new Date().toISOString(), ...registro }, ...apagados];
    setApagados(nuevos);
    escribir('miruta.apagados', nuevos);
  };
  // Excluir horas de reporte (capacitaciones): no cuentan para la eficiencia
  const guardarExclusion = (ex) => {
    const nuevas = [{ id: `ex-${Date.now()}`, creadaEn: new Date().toISOString(), ...ex }, ...exclusiones];
    setExclusiones(nuevas);
    escribir('miruta.exclusiones', nuevas);
  };
  // Habilitar una actividad (queda quién la autorizó) y cancelarla. Con Supabase: tabla actividades_autorizadas
  // (0016); al insertarla, el servidor envía la notificación con sonido al trabajador.
  const guardarActividades = (lista) => {
    setActividades(lista);
    escribir('miruta.actividades', lista);
  };
  const autorizarActividad = (a) =>
    guardarActividades([
      { id: `aut-${Date.now()}-${a.trabajadorId}`, creadaEn: new Date().toISOString(), estado: 'habilitada', ...a },
      ...actividades,
    ]);
  const cancelarActividad = (id, por) =>
    guardarActividades(
      actividades.map((a) =>
        a.id === id ? { ...a, estado: 'cancelada', canceladaPor: por, canceladaEn: new Date().toISOString() } : a,
      ),
    );

  const quitarExclusion = (id) => {
    const nuevas = exclusiones.filter((e) => e.id !== id);
    setExclusiones(nuevas);
    escribir('miruta.exclusiones', nuevas);
  };

  return (
    <NovedadesContext.Provider
      value={{
        formularios,
        guardarFormularios,
        guardarParte,
        apagados,
        apagarGps,
        exclusiones,
        guardarExclusion,
        quitarExclusion,
        actividades,
        autorizarActividad,
        cancelarActividad,
      }}
    >
      {children}
    </NovedadesContext.Provider>
  );
}

export function useNovedades() {
  return useContext(NovedadesContext);
}

// Ejemplos para la demo: dos actividades habilitadas hoy para Carlos (las mismas que ve la app)
function actividadesEjemplo() {
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const creadaEn = new Date(hoy.setHours(7, 10, 0, 0)).toISOString();
  return [
    {
      id: 'aut-demo-1',
      trabajadorId: 't1',
      fecha,
      tipo: 'capacitacion',
      texto: 'Capacitación',
      icono: 'school',
      modo: 'asignado',
      minutos: 60,
      nota: 'Trabajo seguro en alturas',
      autorizadaPor: 'Laura Gómez (SST)',
      creadaEn,
      estado: 'habilitada',
    },
    {
      id: 'aut-demo-2',
      trabajadorId: 't1',
      fecha,
      tipo: 'reunion',
      texto: 'Reunión',
      icono: 'people',
      modo: 'libre',
      minutos: null,
      nota: 'Reunión de seguridad con el cliente',
      autorizadaPor: 'Jorge Pérez (Supervisor)',
      creadaEn,
      estado: 'habilitada',
    },
  ];
}
