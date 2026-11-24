import { REPORTES } from '../config/reportes';
import { mismoDia } from './fechas';
import { enColombia, partesColombia } from './horaColombia';

const MIN = 60 * 1000;

// Hora en Colombia (h:mm), aunque el celular esté en otra zona horaria
export function hhmm(fecha) {
  const p = partesColombia(fecha);
  return `${p.hora}:${String(p.minuto).padStart(2, '0')}`;
}

// Hora hasta la que se puede enviar una franja (la última de la jornada tiene la hora de más)
export const cierreDe = (franja) => franja.cierre ?? franja.fin;

function crearFranja(inicio) {
  const fin = new Date(inicio.getTime() + REPORTES.intervaloMin * MIN);
  return { id: inicio.toISOString(), inicio, fin, etiqueta: `${hhmm(inicio)} – ${hhmm(fin)}` };
}

// Divide el horario del día (el que configuró el administrador) en franjas de una hora: 7:00–8:00, 8:00–9:00, …
// horarioDia = { inicio: 7, fin: 17 } (horas de Colombia) o null si no trabaja ese día.
// La última franja se puede enviar hasta el fin de la jornada + margenCierreMin.
export function franjasDelDia(fecha, horarioDia) {
  if (!horarioDia) return [];
  const lista = [];
  for (let h = horarioDia.inicio; h < horarioDia.fin; h += REPORTES.intervaloMin / 60) {
    lista.push(crearFranja(enColombia(fecha, h)));
  }
  const ultima = lista[lista.length - 1];
  if (ultima) ultima.cierre = new Date(ultima.fin.getTime() + REPORTES.margenCierreMin * MIN);
  return lista;
}

// Hora en que se cierran los reportes de la jornada normal (fin del horario + la hora de más)
export function cierreJornada(fecha, horarioDia) {
  if (!horarioDia) return null;
  return new Date(enColombia(fecha, horarioDia.fin).getTime() + REPORTES.margenCierreMin * MIN);
}

// Estado de una franja según la hora del SERVIDOR:
// enviado · disponible (es la hora actual) · no_reporto (ya pasó sin reporte) · proximo
export function estadoFranja(franja, reportes, ahora) {
  const reporte = reportes.find((r) => r.franjaId === franja.id);
  if (reporte) return { estado: 'enviado', reporte };
  if (ahora < franja.inicio) return { estado: 'proximo' };
  if (ahora < cierreDe(franja)) return { estado: 'disponible' };
  return { estado: 'no_reporto' };
}

// ¿Esta franja se puede enviar ahora mismo? Solo dentro de su hora (la última, hasta el cierre de la jornada).
export function dentroDeLaFranja(franja, ahora) {
  return ahora >= franja.inicio && ahora < cierreDe(franja);
}

// Franja que se puede enviar ahora: la de la hora actual que aún no tenga reporte.
// Antes, en modo demo se inventaba una franja con la hora actual cuando no había ninguna abierta:
// por eso el botón seguía activo después del fin de la jornada. Ahora eso solo pasa en la demo
// los días SIN horario (p. ej. domingo), para poder probar.
export function franjaParaEnviar(franjas, reportes, modoDemo, ahora, hayHorarioHoy = true) {
  const abiertas = franjas.filter((f) => dentroDeLaFranja(f, ahora) && !reportes.some((r) => r.franjaId === f.id));
  if (abiertas.length) return abiertas[abiertas.length - 1];
  if (!modoDemo || hayHorarioHoy) return null;
  const inicio = new Date(ahora);
  inicio.setMinutes(0, 0, 0);
  const demo = { ...crearFranja(inicio), demo: true };
  return reportes.some((r) => r.franjaId === demo.id) ? null : demo;
}

// Minutos que faltan para que cierre la franja
export function minutosRestantes(franja, ahora) {
  return Math.max(0, Math.ceil((cierreDe(franja).getTime() - ahora.getTime()) / MIN));
}

export function reportesDelDia(reportes, fecha) {
  return reportes.filter((r) => mismoDia(r.enviadoEn, fecha));
}
