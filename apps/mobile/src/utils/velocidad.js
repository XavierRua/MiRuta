import { INDICADORES } from '../config/indicadores';
import { color } from '../theme/colors';

// Verde: dentro del límite · Naranja: a 10 km/h o menos del límite · Rojo: por encima (exceso)
export function nivelVelocidad(kmh, rangos = INDICADORES) {
  if (kmh == null) return { texto: 'Sin GPS', color: color.suave, fondo: '#eef2f7' };
  if (kmh > rangos.limiteVelocidad) return { texto: 'Exceso', color: color.rojo, fondo: color.rojoSuave };
  if (kmh >= rangos.limiteVelocidad - rangos.margenCercaLimite)
    return { texto: 'Cerca del límite', color: color.naranja, fondo: color.naranjaSuave };
  return { texto: 'Dentro del límite', color: color.verde, fondo: color.verdeSuave };
}
