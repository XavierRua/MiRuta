import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { api } from '../services/api';

const ExcesosContext = createContext(null);
const EPISODIO_MIN = 5; // si vuelve a pasar el límite antes de 5 min, es el mismo exceso

// Excesos de velocidad registrados desde este celular (hora, ubicación y velocidad).
// En la demo quedan en memoria; con Supabase el servidor los registra solo con cada punto GPS (0005).
export function ExcesosProvider({ children }) {
  const [excesos, setExcesos] = useState([]);
  const actual = useRef(null); // episodio en curso

  const registrarLectura = useCallback(({ kmh, limite, coords, hora }) => {
    if (kmh <= limite) return;
    const ep = actual.current;
    if (ep && hora - ep.ultimo < EPISODIO_MIN * 60000) {
      // mismo episodio: guarda la velocidad más alta y dónde ocurrió
      ep.ultimo = hora;
      if (kmh > ep.velocidad) {
        ep.velocidad = kmh;
        ep.lat = coords.latitude;
        ep.lng = coords.longitude;
        setExcesos((l) => l.map((e) => (e.id === ep.id ? { ...ep } : e)));
      }
      return;
    }
    const nuevo = {
      id: `exc-${hora.getTime()}`,
      fecha: hora,
      ultimo: hora,
      velocidad: kmh,
      limite,
      lat: coords.latitude,
      lng: coords.longitude,
    };
    actual.current = nuevo;
    setExcesos((l) => [nuevo, ...l]);
    api.registrarExceso(nuevo).catch(() => {});
  }, []);

  return <ExcesosContext.Provider value={{ excesos, registrarLectura }}>{children}</ExcesosContext.Provider>;
}

export function useExcesos() {
  return useContext(ExcesosContext);
}
