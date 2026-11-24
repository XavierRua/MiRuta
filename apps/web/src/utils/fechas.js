// Fecha de "hoy" fija mientras usamos datos de ejemplo
const HOY = new Date('2026-11-23');

// Días que faltan para una fecha (negativo si ya pasó)
export function diasPara(fecha) {
  return Math.round((new Date(fecha).getTime() - HOY.getTime()) / 86400000);
}

export function formatoFecha(fecha) {
  return new Date(fecha + 'T00:00').toLocaleDateString('es-CO');
}

// "2026-11-23" ⇄ Date local a las 00:00
export const aTextoFecha = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const deTextoFecha = (t) => new Date(`${t}T00:00`);

// Rango de fechas para "Día", "Semana" (últimos 7 días) y "Mes" (desde el día 1), terminando en "hasta"
export function rangoPeriodo(periodo, hastaTexto) {
  const hasta = deTextoFecha(hastaTexto);
  const desde = new Date(hasta);
  if (periodo === 'Semana') desde.setDate(hasta.getDate() - 6);
  if (periodo === 'Mes') desde.setDate(1);
  return { desde: aTextoFecha(desde), hasta: hastaTexto };
}

// Mensaje de error o null
export function validarRango(desde, hasta) {
  const hoy = aTextoFecha(new Date());
  if (!desde || !hasta) return 'Elige las dos fechas.';
  if (desde > hoy || hasta > hoy) return 'Las fechas no pueden ser posteriores a hoy.';
  if (hasta < desde) return 'La fecha "Hasta" no puede ser anterior a "Desde".';
  return null;
}
