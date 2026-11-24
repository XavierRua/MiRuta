// Hora de Colombia (UTC-5, sin horario de verano), sin depender de la zona horaria del celular.
// Se combina con la hora del servidor (services/horaServidor) para que nadie pueda adelantar o atrasar el reloj.
const OFFSET_MS = 5 * 60 * 60 * 1000;

// Partes de la fecha/hora en Colombia: año, mes (0-11), día, hora, minuto y día de la semana (0 = domingo)
export function partesColombia(fecha) {
  const d = new Date(fecha.getTime() - OFFSET_MS);
  return {
    anio: d.getUTCFullYear(),
    mes: d.getUTCMonth(),
    dia: d.getUTCDate(),
    hora: d.getUTCHours(),
    minuto: d.getUTCMinutes(),
    diaSemana: d.getUTCDay(),
  };
}

// Instante exacto de un día a una hora de Colombia (p. ej. el día de "fecha" a las 17:00 en Colombia)
export function enColombia(fecha, hora, minuto = 0) {
  const p = partesColombia(fecha);
  return new Date(Date.UTC(p.anio, p.mes, p.dia, hora, minuto) + OFFSET_MS);
}
