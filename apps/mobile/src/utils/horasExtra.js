import { REPORTES } from '../config/reportes';
import { HORAS_EXTRA } from '../config/horasExtra';
import { hhmm } from './reportes';
import { enColombia } from './horaColombia';

const MIN = 60 * 1000;

function franja(inicio) {
  const fin = new Date(inicio.getTime() + REPORTES.intervaloMin * MIN);
  return { id: `extra-${inicio.toISOString()}`, inicio, fin, etiqueta: `${hhmm(inicio)} – ${hhmm(fin)}`, extra: true };
}

// Franjas de una hora de una sesión de horas extras, contadas desde su hora de inicio
// (si empezó a las 5:23 p. m.: 5:23–6:23, 6:23–7:23, …).
// - Activa: hasta "ahora" más las próximas horas (para programar recordatorios).
// - Terminada: solo las horas completas; la hora que quedó a medias cuenta solo si se reportó.
export function franjasDeSesion(sesion, ahora, reportes = []) {
  const inicio = new Date(sesion.inicio);
  const fin = sesion.fin ? new Date(sesion.fin) : null;
  const limite = fin ?? new Date(ahora.getTime() + HORAS_EXTRA.recordatoriosAdelanteHoras * 60 * MIN);
  const lista = [];
  for (let t = inicio; t < limite; t = new Date(t.getTime() + REPORTES.intervaloMin * MIN)) {
    const f = franja(t);
    if (fin && f.fin > fin && !reportes.some((r) => r.franjaId === f.id)) break;
    lista.push(f);
  }
  return lista;
}

// ¿Puede iniciar horas extras? Solo cuando terminó la jornada normal de hoy.
export function puedeIniciarExtra(ahora, horarioDia, modoDemo) {
  if (!horarioDia) {
    return modoDemo
      ? { ok: true, aviso: 'Hoy no tienes jornada (permitido solo en la demo)' }
      : { ok: false, motivo: 'Hoy no tienes jornada programada.' };
  }
  const finJornada = enColombia(ahora, horarioDia.fin); // fin del horario del administrador, hora de Colombia
  if (ahora < finJornada)
    return { ok: false, motivo: `Disponible al terminar tu jornada (${hhmm(finJornada)}).`, finJornada };
  return { ok: true, finJornada };
}

export function duracionMs(sesion, ahora) {
  return (sesion.fin ? new Date(sesion.fin) : ahora) - new Date(sesion.inicio);
}

// 6300000 → "1 h 45 min"
export function formatoDuracion(ms) {
  const min = Math.max(0, Math.floor(ms / MIN));
  const h = Math.floor(min / 60);
  return h ? `${h} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`;
}
