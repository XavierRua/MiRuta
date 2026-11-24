import { color } from '../theme/colors';
import { DESPLAZAMIENTO as D } from '../config/desplazamiento';

// Cómo se muestra cada modo (íconos de MaterialCommunityIcons, incluidos en Expo)
export const MODOS = {
  a_pie: { texto: 'A pie', icono: 'walk', emoji: '🚶', color: color.verde, fondo: color.verdeSuave },
  vehiculo: { texto: 'En vehículo', icono: 'motorbike', emoji: '🏍️', color: color.azul, fondo: color.azulSuave },
  quieto: { texto: 'Quieto', icono: 'human-handsdown', emoji: '⏸️', color: color.suave, fondo: '#eef2f7' },
};

// Ícono del vehículo asignado: moto o carro
export const iconoVehiculo = (tipo) =>
  tipo === 'carro'
    ? { icono: 'car', emoji: '🚗' }
    : tipo === 'camion'
      ? { icono: 'truck', emoji: '🚚' }
      : { icono: 'motorbike', emoji: '🏍️' };

export function infoModo(modo, tipoVehiculo) {
  const m = MODOS[modo] ?? MODOS.quieto;
  return modo === 'vehiculo' ? { ...m, ...iconoVehiculo(tipoVehiculo) } : m;
}

// Qué parece estar haciendo AHORA (sin confirmar): 'a_pie' | 'vehiculo' | 'quieto' | null (dudoso)
// cadencia = null cuando el celular no tiene podómetro o no dio permiso: se decide solo con la velocidad.
export function candidato({ kmh, cadencia }) {
  if (cadencia == null) {
    if (kmh >= D.velMinVehiculo) return 'vehiculo';
    if (kmh >= D.velMinPieSinPasos && kmh <= D.velMaxPieSinPasos) return 'a_pie';
    if (kmh < D.velQuieto) return 'quieto';
    return null;
  }
  if (kmh >= D.velMinVehiculo) return 'vehiculo';
  if (cadencia >= D.cadenciaCaminando && kmh <= D.velMaxPie) return 'a_pie';
  if (kmh > D.velMaxPie && cadencia < D.cadenciaMinima) return 'vehiculo';
  if (kmh < D.velQuieto && cadencia < D.cadenciaMinima) return 'quieto';
  return null; // zona gris (p. ej. 5 km/h sin pasos): se mantiene el modo actual
}

// Clasificador con "histéresis": solo cambia de modo cuando el nuevo se sostiene un tiempo.
// Así un semáforo en rojo (vehículo detenido, sin pasos) sigue siendo "vehículo".
export function nuevoClasificador(inicial = 'quieto') {
  let modo = inicial;
  let pendiente = null; // { modo, desde }
  return {
    get modo() {
      return modo;
    },
    procesar({ kmh, cadencia, t }) {
      const c = candidato({ kmh, cadencia });
      if (!c || c === modo) {
        pendiente = null;
        return modo;
      }
      if (!pendiente || pendiente.modo !== c) pendiente = { modo: c, desde: t };
      const espera = c === 'quieto' && modo === 'vehiculo' ? D.confirmarSeg.quietoDesdeVehiculo : D.confirmarSeg[c];
      if ((t - pendiente.desde) / 1000 >= espera) {
        modo = c;
        pendiente = null;
      }
      return modo;
    },
  };
}

export function textoMin(seg) {
  const min = Math.round((seg ?? 0) / 60);
  const h = Math.floor(min / 60);
  return h ? `${h} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`;
}

export const kmTexto = (km) => `${(Math.round((km ?? 0) * 10) / 10).toString().replace('.', ',')} km`;
