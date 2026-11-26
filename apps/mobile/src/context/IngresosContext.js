import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { ahoraServidor } from '../services/horaServidor';
import { escucharBateria, leerBateria } from '../services/bateria';
import { registrarIngreso, suscribirIngresos } from '../services/ingresos';
import { notificarAhora } from '../services/notificaciones';
import { enColombia, partesColombia } from '../utils/horaColombia';
import { useSesion } from './SesionContext';

const IngresosContext = createContext(null);

// Ingresos a la app (con su batería y ubicación) para el Historial, y aviso de batería baja:
// si durante el horario la batería baja del nivel configurado y no está cargando, se le avisa al trabajador
// (una vez por día) y queda registrado; el servidor crea la alerta para los perfiles con ese permiso.
export function IngresosProvider({ children }) {
  const [ingresos, setIngresos] = useState([]);
  const { paso } = useSesion();
  const avisadoHoy = useRef(null);

  useEffect(() => suscribirIngresos(setIngresos), []);

  useEffect(() => {
    if (paso !== 'listo') return;
    const revisar = (b) => {
      const ahora = ahoraServidor();
      const horario = api.getHorarioDia(ahora);
      const umbral = api.getIndicadores().bateriaBajaPct ?? 20;
      const dia = `${partesColombia(ahora).anio}-${partesColombia(ahora).mes}-${partesColombia(ahora).dia}`;
      const enHorario = horario && ahora >= enColombia(ahora, horario.inicio) && ahora < enColombia(ahora, horario.fin);
      if (!b || b.cargando || b.pct >= umbral || !enHorario || avisadoHoy.current === dia) return;
      avisadoHoy.current = dia;
      notificarAhora(
        'Batería baja',
        `Tu celular tiene ${b.pct} % de batería. Cárgalo para no perder tus reportes ni el registro de tu jornada.`,
        { tipo: 'bateria_baja' },
      ).catch(() => {});
      registrarIngreso('bateria_baja').catch(() => {});
    };
    leerBateria().then(revisar);
    const quitar = escucharBateria(revisar);
    const id = setInterval(() => leerBateria().then(revisar), 5 * 60000);
    return () => {
      quitar();
      clearInterval(id);
    };
  }, [paso]);

  return <IngresosContext.Provider value={{ ingresos }}>{children}</IngresosContext.Provider>;
}

export function useIngresos() {
  return useContext(IngresosContext);
}
