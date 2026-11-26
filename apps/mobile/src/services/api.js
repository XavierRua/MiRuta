// Capa de acceso a datos.
// Hoy usa datos de ejemplo; cuando conectemos Supabase, solo cambia este archivo.
import { INDICADORES } from '../config/indicadores';
import { PERMISOS_POR_ROL } from '../config/permisos';
import {
  ITEMS_PREOPERACIONAL,
  PREGUNTAS_SALUD,
  REGLAS_JORNADA,
  TIPOS_ACTIVIDAD_EJEMPLO,
  TIPOS_PAUSA,
} from '../config/formularios';
import { programacionesEjemplo } from '../data/programacion';
import {
  cuentasDemo,
  documentosAdicionales,
  empresa,
  horario,
  horarioSemana,
  hoy,
  jornadas,
  reportesDeEjemplo,
  vehiculo,
  vehiculosEmpresa,
  yo,
} from '../data/mock';
import { mismoDia, soloDia } from '../utils/fechas';
import { cierreDe, dentroDeLaFranja, estadoFranja, franjasDelDia } from '../utils/reportes';
import { aplicarPausas, textoExtension } from '../utils/pausas';
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
  // Empresa del trabajador. logoUrl lo sube el administrador desde la web (Configuración → Logo de la empresa);
  // null = se muestra el logo de MiRuta. Con Supabase: empresas.logo_url (bucket público "logos", 0015).
  getEmpresa: () => empresa,
  getJornadaHoy: () => hoy,
  // Horario que configuró el administrador para ese día (día de la semana en Colombia).
  // Con Supabase: horario asignado al trabajador > a su grupo > a la empresa (función fin_horario_hoy, 0007/0010).
  getHorarioDia: (fecha) => horarioSemana[partesColombia(fecha).diaSemana],
  // Límite de velocidad y rangos de eficiencia que configura el administrador.
  // Con Supabase: select * from configuracion_empresa (los mismos valores del panel web).
  getIndicadores: () => INDICADORES,
  // Permisos encendidos para el rol del usuario.
  // Con Supabase: select permiso from permisos_rol where empresa_id = … and rol = … and activo (0012).
  getPermisos: () => PERMISOS_POR_ROL.trabajador,

  // ---------- Inicio y fin de jornada ----------
  // Preguntas, ítems y pausas que configura el administrador en la web. Con Supabase: tablas de 0014.
  getFormularios: () => ({
    preguntasSalud: PREGUNTAS_SALUD,
    itemsPreoperacional: ITEMS_PREOPERACIONAL,
    // Con Supabase: armarDescansos(filas de tipos_pausa con clase 'descanso'), tal como las dejó la web
    tiposPausa: TIPOS_PAUSA,
    tiposActividad: TIPOS_ACTIVIDAD_EJEMPLO,
    reglas: REGLAS_JORNADA,
  }),
  // Actividades autorizadas para hoy (capacitación, reunión, cita médica…): las habilita en la web un perfil con
  // el permiso "web.actividades.autorizar" para este trabajador y esta fecha. Con Supabase: tabla
  // actividades_autorizadas (0016), en tiempo real. modo 'asignado' = alarma y cierre automático; 'libre' = cronómetro.
  getActividadesAutorizadas: (fecha) => {
    const dia = partesColombia(fecha);
    if (!horarioSemana[dia.diaSemana]) return [];
    const clave = `${dia.anio}-${dia.mes + 1}-${dia.dia}`;
    return [
      {
        id: `aut-${clave}-1`,
        tipo: 'capacitacion',
        texto: 'Capacitación',
        icono: 'school',
        modo: 'asignado',
        minutos: 60,
        nota: 'Trabajo seguro en alturas',
        autorizadaPor: 'Laura Gómez (SST)',
      },
      {
        id: `aut-${clave}-2`,
        tipo: 'reunion',
        texto: 'Reunión',
        icono: 'people',
        modo: 'libre',
        minutos: null,
        nota: 'Reunión de seguridad con el cliente',
        autorizadaPor: 'Jorge Pérez (Supervisor)',
      },
    ];
  },
  // Vehículos de la empresa que puede usar (para el preoperacional)
  getVehiculosEmpresa: () => vehiculosEmpresa,
  // Horas de reporte que la empresa excluyó (capacitaciones): no cuentan para la eficiencia
  getFranjasExcluidas: () => [],
  // Estado de la jornada que puede cambiar desde la web (p. ej. el supervisor apagó el GPS).
  // Con Supabase: suscripción en tiempo real a la tabla apagados_gps.
  getEstadoJornada: async () => null,
  // Con Supabase: inserts en reportes_salud, preoperacionales, pausas e incidentes; el servidor crea las
  // alertas con sonido para el administrador, el supervisor y SST (triggers de 0014).
  enviarFormulario: async (tipo, datos) => {
    await espera(400);
    console.log('[demo] formulario', tipo, datos?.alerta ? '→ ALERTA' : '');
    return { ...datos, recibidoEn: new Date().toISOString() };
  },

  // ---------- Documentos ----------
  // Adicionales (ARL, planilla, alturas, confinados, exámenes): los sube SST desde la web; aquí solo se leen.
  // Con Supabase: select de documentos_trabajador del propio trabajador (la RLS de 0011 decide quién ve cada uno).
  getDocumentosAdicionales: () => documentosAdicionales,
  // Con Supabase: sube la foto al bucket privado "documentos" y crea una nueva versión (la anterior se conserva).
  subirDocumentoVehiculo: async (doc) => {
    await espera(500);
    console.log('[demo] documento', doc.id, doc.vence, `${doc.foto?.pesoKB ?? '?'} KB`);
  },

  // ---------- Eliminación del perfil ----------
  // El trabajador la solicita; solo se ejecuta cuando el administrador la aprueba (0011).
  solicitarEliminacionPerfil: async (motivo) => {
    await espera(500);
    return { estado: 'pendiente', solicitadaEn: new Date().toISOString(), motivo };
  },
  cancelarEliminacionPerfil: async () => {
    await espera(300);
  },
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
  getReportesDia: (fecha, reportesEnviados, franjasExtra = [], pausas = []) => {
    const ahora = ahoraServidor();
    if (!mismoDia(fecha, ahora)) {
      const jornada = jornadas.find((j) => mismoDia(j.fecha, fecha));
      return jornada ? reportesDeEjemplo(jornada) : [];
    }
    const franjas = aplicarPausas(
      [...franjasDelDia(fecha, horarioSemana[partesColombia(fecha).diaSemana]), ...franjasExtra],
      pausas,
      ahora,
      cierreDe,
    );
    const propios = reportesEnviados.filter((r) => mismoDia(r.enviadoEn, fecha));
    // Horas cubiertas por una pausa completa: "En pausa – Almuerzo" (no cuentan en la eficiencia)
    const enPausa = franjas
      .filter((f) => f.enPausa && !propios.some((r) => r.franjaId === f.id))
      .map((f) => ({
        id: `${f.id}-p`,
        franjaId: f.id,
        franja: f.etiqueta,
        estado: 'en_pausa',
        pausa: f.enPausa.texto,
      }));
    const faltantes = franjas
      .filter((f) => !f.enPausa && estadoFranja(f, propios, ahora).estado === 'no_reporto')
      .map((f) => ({
        id: `${f.id}-x`,
        franjaId: f.id,
        franja: f.etiqueta,
        estado: 'no_reporto',
        extra: !!f.extra,
        extensionTexto: textoExtension(f),
      }));
    const orden = (r) => r.franjaId.replace('extra-', '');
    return [...propios, ...enPausa, ...faltantes].sort((a, b) => orden(b).localeCompare(orden(a)));
  },

  // Con Supabase: se suben las fotos y se inserta el reporte. La base de datos vuelve a validar
  // con SU hora (now()) que el reporte llegue dentro de la franja; si no, lo rechaza.
  // En la demo se hace la misma validación con la hora del servidor obtenida por internet.
  // pausas = pausas y actividades autorizadas del día. Con Supabase el servidor usa SUS registros (tabla pausas):
  // la ventana se extiende por los minutos de pausa que cayeron dentro de ella (0016).
  enviarReporte: async (reporte, pausas = []) => {
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
    if (pausas.some((p) => !p.fin)) {
      throw new Error('Estás en pausa. Podrás enviar el reporte cuando termine.');
    }
    const conPausas = franja ? aplicarPausas([franja], pausas, recibidoEn, cierreDe)[0] : null;
    if (conPausas?.enPausa) {
      throw new Error(`Toda esta hora estuviste en ${conPausas.enPausa.texto.toLowerCase()}: no necesita reporte.`);
    }
    if (conPausas && !dentroDeLaFranja(conPausas, recibidoEn)) {
      throw new Error(`La hora de este reporte (${reporte.franja}) ya cerró. Quedó registrado como "No reportó".`);
    }
    await espera(600); // simula la subida
    return {
      ...reporte,
      id: `local-${Date.now()}`,
      enviadoEn: recibidoEn,
      estado: 'a_tiempo',
      // Nota del reporte: "Extendido +15 min por desayuno" (la calcula el servidor con sus registros de pausas)
      extensionMin: conPausas?.extensionMin ?? 0,
      extensionTexto: textoExtension(conPausas),
    };
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

  // Registro de ingresos (ingreso con PIN, PIN incorrecto, bloqueo, batería baja) con batería y ubicación.
  // Con Supabase: tabla ingresos_app (0017); el servidor calcula la llegada tarde y crea las alertas.
  registrarIngreso: async (r) => {
    console.log(
      '[demo] ingreso:',
      r.tipo,
      r.hora,
      r.bateria ? `${r.bateria.pct}%` : 'sin batería',
      r.minutosTarde ? `tarde ${r.minutosTarde} min` : '',
    );
  },

  // Bandeja de notificaciones. Con Supabase: tabla notificaciones_trabajador (0015).
  // Cada notificación que llega al celular queda registrada (entregada) y, al marcarla como leída, se guarda la hora:
  // en la web se ve quién la leyó y cuándo.
  registrarNotificacion: async (n) => {
    console.log('[demo] notificación entregada:', n.tipo, n.titulo);
  },
  marcarNotificacionesLeidas: async (ids, leidaEn) => {
    console.log('[demo] notificaciones leídas:', ids.length, leidaEn);
  },
};
