// Hora confiable: se toma del servidor y no del reloj del celular.
// Se calcula la diferencia (desfase) entre ambos y se aplica a Date.now().
// Así, aunque el trabajador cambie la hora del teléfono, la app sigue usando la hora real.
import { HORA_SERVIDOR } from '../config/reportes';

let desfaseMs = 0;
let ultimaSincronizacion = null;

// Consulta la hora del servidor (encabezado HTTP "Date"). Devuelve true si lo logró.
export async function sincronizarHora() {
  try {
    const t0 = Date.now();
    const r = await fetch(`${HORA_SERVIDOR.url}?t=${t0}`, { method: 'GET', cache: 'no-store' });
    const t1 = Date.now();
    const fecha = r.headers.get('date');
    if (!fecha) return false;
    // El servidor respondió más o menos a la mitad del viaje de ida y vuelta
    desfaseMs = new Date(fecha).getTime() + 500 - (t0 + t1) / 2;
    ultimaSincronizacion = Date.now();
    return true;
  } catch {
    return false;
  }
}

// ¿La hora del servidor es reciente? Si no, hay que sincronizar antes de permitir un envío.
export function horaVerificada() {
  return ultimaSincronizacion != null && Date.now() - ultimaSincronizacion < HORA_SERVIDOR.resincronizarMin * 2 * 60000;
}

// Hora actual según el servidor
export function ahoraServidor() {
  return new Date(Date.now() + desfaseMs);
}

// Minutos que el reloj del celular está corrido respecto al servidor (+ adelantado, − atrasado)
export function desfaseMinutos() {
  return Math.round(-desfaseMs / 60000);
}

// Convierte una hora real (servidor) a la hora del reloj del celular,
// para programar notificaciones que suenen a la hora correcta aunque el celular esté mal
export function aRelojDelCelular(fechaServidor) {
  return new Date(fechaServidor.getTime() - desfaseMs);
}
