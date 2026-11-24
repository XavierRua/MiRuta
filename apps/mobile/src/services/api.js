// Capa de acceso a datos.
// Hoy usa datos de ejemplo; cuando conectemos Supabase, solo cambia este archivo.
import { INDICADORES } from '../config/indicadores';
import { programacionesEjemplo } from '../data/programacion';
import { cuentasDemo, horario, horarioSemana, hoy, jornadas, reportesDeEjemplo, vehiculo, yo } from '../data/mock';
import { mismoDia, soloDia } from '../utils/fechas';
import { dentroDeLaFranja, estadoFranja, franjasDelDia } from '../utils/reportes';
import { partesColombia } from '../utils/horaColombia';
import { ahoraServidor, horaVerificada, sincronizarHora } from './horaServidor';

// Error con un "tipo" para que la pantalla sepa qué mostrar
export class ErrorIngreso extends Error {
  constructor(tipo, mensaje) {
    super(mensaje);
    this.tipo = tipo;
  }
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export const api = {
  getPerfil: () => ({ yo, vehiculo, horario }),
  getJornadaHoy: () => hoy,
  // Horario que configuró el administrador para ese día (día de la semana en Colombia).
  // Con Supabase: horario asignado al trabajador > a su grupo > a la empresa (función fin_horario_hoy, 0007/0010).
  getHorarioDia: (fecha) => horarioSemana[partesColombia(fecha).diaSemana],
  // Límite de velocidad y rangos de eficiencia que configura el administrador.
  // Con Supabase: select * from configuracion_empresa (los mismos valores del panel web).
  getIndicadores: () => INDICADORES,
  // Visitas que programó el administrador para este trabajador.
  // Con Supabase: select de programaciones + visitas del día (0008), y suscripción en tiempo real a cambios.
  getProgramaciones: () => programacionesEjemplo,
  // Con Supabase: el servidor registra llegada y salida con los puntos GPS (trigger de 0008).
  registrarVisita: async (registro) => {
    console.log('[demo] visita', registro.programacionId, registro.periodos?.length ?? registro.puntos?.length);
  },
  // Alerta al administrador: salió del área asignada (nombre, hora y ubicación).
  // Con Supabase la crea el servidor con los puntos GPS (0009); el celular no puede borrarla.
  alertarSalidaArea: async (alerta) => {
    console.log('[demo] alerta salida de área', alerta.titulo, alerta.hora, alerta.lat, alerta.lng);
  },

  // Jornadas entre dos fechas (ambas incluidas), de la más reciente a la más antigua
  getJornadas: (desde, hasta) => {
    const d = soloDia(desde).getTime();
    const h = soloDia(hasta).getTime();
    return jornadas.filter((j) => j.fecha.getTime() >= d && j.fecha.getTime() <= h);
  },

  // Reportes de un día, una fila por hora del horario:
  // enviados (desde este celular o de ejemplo) y "no_reporto" para las horas que ya pasaron sin reporte
  getReportesDia: (fecha, reportesEnviados, franjasExtra = []) => {
    const ahora = ahoraServidor();
    if (!mismoDia(fecha, ahora)) {
      const jornada = jornadas.find((j) => mismoDia(j.fecha, fecha));
      return jornada ? reportesDeEjemplo(jornada) : [];
    }
    const franjas = [...franjasDelDia(fecha, horarioSemana[partesColombia(fecha).diaSemana]), ...franjasExtra];
    const propios = reportesEnviados.filter((r) => mismoDia(r.enviadoEn, fecha));
    const faltantes = franjas
      .filter((f) => estadoFranja(f, propios, ahora).estado === 'no_reporto')
      .map((f) => ({ id: `${f.id}-x`, franjaId: f.id, franja: f.etiqueta, estado: 'no_reporto', extra: !!f.extra }));
    const orden = (r) => r.franjaId.replace('extra-', '');
    return [...propios, ...faltantes].sort((a, b) => orden(b).localeCompare(orden(a)));
  },

  // Con Supabase: se suben las fotos y se inserta el reporte. La base de datos vuelve a validar
  // con SU hora (now()) que el reporte llegue dentro de la franja; si no, lo rechaza.
  // En la demo se hace la misma validación con la hora del servidor obtenida por internet.
  enviarReporte: async (reporte) => {
    if (!(await sincronizarHora()) && !horaVerificada()) {
      throw new Error('Sin conexión: no podemos verificar la hora oficial. Conéctate e intenta de nuevo.');
    }
    const recibidoEn = ahoraServidor();
    // No se confía en la franja que manda el celular: se vuelve a armar con el horario del administrador.
    // Una franja normal tiene que pertenecer al horario de hoy; una extra, a una sesión de horas extras.
    const franja = reporte.franjaId.startsWith('extra-')
      ? { inicio: new Date(reporte.franjaInicio), fin: new Date(reporte.franjaFin) }
      : franjasDelDia(recibidoEn, api.getHorarioDia(recibidoEn)).find((f) => f.id === reporte.franjaId);
    if (!franja && !(reporte.demo && !api.getHorarioDia(recibidoEn))) {
      throw new Error('Tu jornada ya terminó: no se pueden enviar más reportes hoy.');
    }
    if (franja && !dentroDeLaFranja(franja, recibidoEn)) {
      throw new Error(`La hora de este reporte (${reporte.franja}) ya cerró. Quedó registrado como "No reportó".`);
    }
    await espera(600); // simula la subida
    return { ...reporte, id: `local-${Date.now()}`, enviadoEn: recibidoEn, estado: 'a_tiempo' };
  },

  // Vincula este celular a la cuenta del trabajador.
  // Con Supabase lo hará una Edge Function: valida el código (de un solo uso, vence en 24 h),
  // registra el celular y, si la cuenta ya tiene otro, rechaza y crea una alerta para el administrador.
  activarDispositivo: async ({ codigoEmpresa, cedula, codigo, dispositivo }) => {
    await espera(700);
    const cuentasEmpresa = cuentasDemo.filter((c) => c.codigoEmpresa === codigoEmpresa.trim().toUpperCase());
    if (!cuentasEmpresa.length) throw new ErrorIngreso('empresa', 'El código de empresa no existe.');
    const cuenta = cuentasEmpresa.find((c) => c.cedula === cedula.replace(/\D/g, ''));
    if (!cuenta) throw new ErrorIngreso('cedula', 'No encontramos un trabajador con esa cédula en esta empresa.');
    if (cuenta.celularVinculado && cuenta.celularVinculado !== dispositivo.modelo) {
      await api.avisarAdministrador('intento_otro_celular', cuenta, dispositivo);
      throw new ErrorIngreso(
        'otro_celular',
        `Tu cuenta ya está vinculada a otro celular (${cuenta.celularVinculado}). Avisamos al administrador; pídele que la desvincule si cambiaste de equipo.`,
      );
    }
    if (codigo !== cuenta.codigoActivacion)
      throw new ErrorIngreso('codigo', 'El código de activación es incorrecto o ya venció.');
    return {
      trabajador: cuenta.trabajador,
      empresa: cuenta.empresa,
      celular: dispositivo,
      vinculadoEn: new Date().toISOString(),
    };
  },

  // Con Supabase: inserta una fila en "alertas" y el panel web la muestra al instante
  // Horas extras. Con Supabase se llaman las funciones iniciar_horas_extra() y finalizar_horas_extra()
  // (0007), que toman la hora con now() del servidor y crean la alerta para el administrador.
  iniciarHorasExtra: async (sesion) => {
    await espera(500);
    console.log('[demo] aviso al administrador: inició horas extras', sesion.inicio);
  },
  finalizarHorasExtra: async (sesion) => {
    await espera(500);
    console.log('[demo] aviso al administrador: finalizó horas extras', sesion.inicio, '→', sesion.fin);
  },

  // Con Supabase: el servidor registra cada exceso al recibir los puntos GPS (trigger de 0005)
  // y crea la alerta para el administrador. Aquí solo se deja constancia en la demo.
  registrarExceso: async (exceso) => {
    console.log('[demo] exceso de velocidad:', exceso.velocidad, 'km/h', exceso.lat, exceso.lng);
  },

  avisarAdministrador: async (tipo, cuenta, dispositivo) => {
    console.log('[demo] alerta al administrador:', tipo, cuenta?.cedula ?? '', dispositivo?.modelo ?? '');
  },
};
