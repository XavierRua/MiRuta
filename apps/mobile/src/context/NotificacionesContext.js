import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { config } from '../config/app';
import { ahoraServidor } from '../services/horaServidor';
import {
  agregar,
  hayNotificaciones,
  marcarLeidas,
  marcarTodasLeidas,
  sincronizar,
  suscribir,
} from '../services/bandeja';

const NotificacionesContext = createContext(null);

// Lista de la campana: de la más reciente a la más antigua, con el número de sin leer.
// Revisa cada 30 s (y al volver a la app) si ya llegó la hora de algún aviso programado.
export function NotificacionesProvider({ children }) {
  const [lista, setLista] = useState([]);

  useEffect(() => {
    const quitar = suscribir(setLista);
    const revisar = () => sincronizar(ahoraServidor()).catch(() => {});
    revisar();
    const intervalo = setInterval(revisar, 30000);
    const sub = AppState.addEventListener('change', (e) => e === 'active' && revisar());
    // Demo: unos avisos de ejemplo la primera vez para ver cómo funciona la campana
    if (config.modoDemo) {
      hayNotificaciones().then((hay) => {
        if (!hay) ejemplosDemo().forEach((n) => agregar(n));
      });
    }
    return () => {
      quitar();
      clearInterval(intervalo);
      sub.remove();
    };
  }, []);

  const marcarLeida = useCallback((id) => marcarLeidas([id], ahoraServidor()), []);
  const marcarTodas = useCallback(() => marcarTodasLeidas(ahoraServidor()), []);
  const sinLeer = lista.filter((n) => !n.leida).length;

  return (
    <NotificacionesContext.Provider value={{ lista, sinLeer, marcarLeida, marcarTodas }}>
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  return useContext(NotificacionesContext);
}

function ejemplosDemo() {
  const hace = (min) => new Date(Date.now() - min * 60000).toISOString();
  return [
    {
      id: 'demo-visita',
      tipo: 'visita',
      titulo: 'Nueva visita asignada',
      cuerpo: 'Ferretería El Tornillo · llegada estimada 10:30',
      fecha: hace(95),
    },
    {
      id: 'demo-documento',
      tipo: 'documento',
      titulo: 'Documento próximo a vencer',
      cuerpo: 'Tu SOAT vence en 15 días. Renuévalo a tiempo.',
      fecha: hace(240),
    },
    {
      id: 'demo-exceso',
      tipo: 'exceso',
      titulo: 'Exceso de velocidad',
      cuerpo: 'Ibas a 72 km/h y el límite es 60 km/h. Quedó registrado.',
      fecha: hace(60 * 26),
      leida: true,
      leidaEn: hace(60 * 25),
    },
  ];
}
