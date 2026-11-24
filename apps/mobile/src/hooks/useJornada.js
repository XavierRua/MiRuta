import { api } from '../services/api';

// Datos de la jornada de hoy para la pantalla principal
export function useJornada() {
  const { yo, horario } = api.getPerfil();
  const hoy = api.getJornadaHoy();
  return { yo, horario, hoy };
}
