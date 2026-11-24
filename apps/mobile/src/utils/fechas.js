const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Copia de la fecha a las 00:00 (para comparar solo el día, sin la hora)
export function soloDia(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function hoy() {
  return soloDia(new Date());
}

export function mismoDia(a, b) {
  return soloDia(a).getTime() === soloDia(b).getTime();
}

// 23/11/2026
export function formatoFecha(fecha) {
  const d = soloDia(fecha);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// "Hoy · lun 23 nov" o "sáb 21 nov"
export function formatoDiaCorto(fecha) {
  const d = soloDia(fecha);
  const texto = `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
  return mismoDia(d, hoy()) ? `Hoy · ${texto}` : texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Rango de los últimos 7 días (incluye hoy)
export function rangoSemana() {
  const hasta = hoy();
  const desde = new Date(hasta);
  desde.setDate(hasta.getDate() - 6);
  return { desde, hasta };
}

// Del día 1 del mes actual hasta hoy
export function rangoMes() {
  const hasta = hoy();
  return { desde: new Date(hasta.getFullYear(), hasta.getMonth(), 1), hasta };
}

// Devuelve un mensaje de error, o null si el rango es válido
export function validarRango(desde, hasta) {
  const d = soloDia(desde);
  const h = soloDia(hasta);
  if (d > hoy()) return 'La fecha "Desde" no puede ser posterior a hoy.';
  if (h > hoy()) return 'La fecha "Hasta" no puede ser posterior a hoy.';
  if (h < d) return 'La fecha "Hasta" no puede ser anterior a "Desde".';
  return null;
}