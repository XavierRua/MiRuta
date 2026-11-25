// Notificaciones locales (reportes de actividad, visitas, documentos, pausas, excesos…).
// Todas quedan además en la bandeja de la campana (services/bandeja.js).
// Las programa el propio celular, así que suenan y vibran aunque la app esté cerrada o en segundo plano
// (también sin internet). Las horas se calculan con la hora del servidor.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { REPORTES } from '../config/reportes';
import { hhmm } from '../utils/reportes';
import { aRelojDelCelular, ahoraServidor } from './horaServidor';
import { agregar, agregarPendiente, quitarPendientes } from './bandeja';

// En Android el sonido y la vibración se definen en el "canal" y no se pueden cambiar después de crearlo;
// por eso este canal tiene un nombre nuevo.
const CANAL = 'reportes-sonido';
const VIBRACION = [0, 500, 250, 500];
const MAX_PROGRAMADAS = 60; // iPhone permite máximo 64 notificaciones programadas por app
const programadas = {}; // franjaId → ids, para cancelarlas cuando se envía el reporte

// Cómo se muestran si llegan con la app abierta: también con sonido
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function prepararNotificaciones() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Reportes de actividad',
      description: 'Recordatorios y avisos de tus reportes de cada hora',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: VIBRACION,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
  const { granted } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: true },
  });
  return granted;
}

function contenido(titulo, cuerpo, datos) {
  return {
    title: titulo,
    body: cuerpo,
    data: datos,
    sound: 'default', // iPhone: suena (y vibra según los ajustes del teléfono)
    vibrate: VIBRACION, // Android
    priority: Notifications.AndroidNotificationPriority.MAX,
  };
}

// Toda notificación queda también en la bandeja de la campana: las programadas, cuando llega su hora
async function programar(fechaServidor, titulo, cuerpo, datos) {
  if (fechaServidor <= ahoraServidor()) return null;
  const id = await Notifications.scheduleNotificationAsync({
    content: contenido(titulo, cuerpo, datos),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: aRelojDelCelular(fechaServidor), // suena a la hora real aunque el reloj del celular esté mal
      channelId: CANAL,
    },
  });
  await agregarPendiente({
    id,
    tipo: datos?.tipo ?? 'aviso',
    titulo,
    cuerpo,
    fecha: fechaServidor.toISOString(),
    datos,
  }).catch(() => {});
  return id;
}

// Aviso inmediato: suena ya y entra a la bandeja
async function inmediata(titulo, cuerpo, datos) {
  const id = await Notifications.scheduleNotificationAsync({
    content: contenido(titulo, cuerpo, datos),
    trigger: Platform.OS === 'android' ? { channelId: CANAL } : null,
  });
  await agregar({
    id: id ?? `n-${Date.now()}`,
    tipo: datos?.tipo ?? 'aviso',
    titulo,
    cuerpo,
    fecha: ahoraServidor().toISOString(),
    datos,
  }).catch(() => {});
  return id;
}

// Programa, para cada hora sin reporte:
// 1. al abrir la hora: "Ya puedes enviar tu reporte"
// 2. 10 minutos antes de cerrar: "Te quedan 10 minutos"
// 3. al cerrar la hora: "No reportaste" (se cancela si envía el reporte)
// pausas = [{ inicio, fin }]: mientras el trabajador está en pausa no se programa ningún recordatorio.
// El cierre de cada franja ya viene extendido por sus pausas (utils/pausas.js).
export async function programarRecordatorios(franjas, reportes, pausas = []) {
  const enPausa = (fecha) => pausas.some((p) => fecha >= p.inicio && fecha < p.fin);
  const siNoEnPausa = (fecha, ...resto) => (enPausa(fecha) ? Promise.resolve(null) : programar(fecha, ...resto));
  // Solo se cancelan los recordatorios de reportes (los avisos de documentos se mantienen)
  await cancelarPorTipo(['reporte', 'no_reporto']);
  Object.keys(programadas).forEach((k) => delete programadas[k]);
  let total = 0;

  for (const f of franjas) {
    if (reportes.some((r) => r.franjaId === f.id)) continue;
    if (total + 3 > MAX_PROGRAMADAS) break;
    const datos = { franjaId: f.id, tipo: 'reporte' };
    // La última hora de la jornada cierra con la hora de más (cierre); las demás, al terminar su hora.
    // Después del cierre de la jornada no se programa nada (salvo franjas de horas extras activas).
    const cierre = f.cierre ?? f.fin;
    const aviso = new Date(cierre.getTime() - REPORTES.avisoAntesDeCerrarMin * 60000);
    const ids = await Promise.all([
      siNoEnPausa(
        f.inicio,
        'Ya puedes enviar tu reporte',
        `Tienes hasta las ${hhmm(cierre)} para reportar ${f.etiqueta}.`,
        datos,
      ),
      siNoEnPausa(
        aviso,
        `Te quedan ${REPORTES.avisoAntesDeCerrarMin} minutos`,
        `Envía tu reporte de ${f.etiqueta} antes de que cierre la hora.`,
        datos,
      ),
      siNoEnPausa(
        cierre,
        'No reportaste',
        `No enviaste el reporte de ${f.etiqueta}. Quedó registrado como "No reportó".`,
        {
          ...datos,
          tipo: 'no_reporto',
        },
      ),
    ]);
    programadas[f.id] = ids.filter(Boolean);
    total += programadas[f.id].length;
  }
}

// Al enviar un reporte: se cancelan sus recordatorios y suena la confirmación
export async function cancelarRecordatorios(franjaId) {
  const ids = programadas[franjaId] ?? [];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await quitarPendientes({ ids }).catch(() => {});
  delete programadas[franjaId];
}

export async function notificarEnviado(etiqueta) {
  await inmediata('Reporte enviado', `Tu reporte de ${etiqueta} quedó registrado.`, { tipo: 'enviado' });
}

// Aviso con sonido cuando el administrador asigna, cambia o cancela una visita (tipo 'visita'),
// o cuando sale del área de su única visita del día (tipo 'geocerca').
// Con Supabase lo envía el servidor como notificación push; en la demo se genera aquí.
export async function notificarVisita(titulo, cuerpo, tipo = 'visita') {
  await prepararNotificaciones();
  await inmediata(titulo, cuerpo, { tipo });
}

// Cancela las notificaciones programadas de ciertos tipos (datos.tipo)
async function cancelarPorTipo(tipos) {
  const todas = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    todas
      .filter((n) => tipos.includes(n.content?.data?.tipo))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  await quitarPendientes({ tipos }).catch(() => {});
}

// Avisos de vencimiento de documentos: 15 días antes y el día que vence (a las 8:00 a. m.).
// docs = [{ id, nombre, vence: 'AAAA-MM-DD' }]. Al administrador y a SST les avisa el servidor (0011).
export async function programarAvisosDocumentos(docs, diasAviso) {
  await cancelarPorTipo(['documento']);
  for (const d of docs) {
    if (!d.vence) continue;
    const [a, m, dd] = d.vence.split('-').map(Number);
    const vence = new Date(a, m - 1, dd, 8, 0, 0);
    const antes = new Date(vence.getTime() - diasAviso * 24 * 3600000);
    const datos = { tipo: 'documento', documento: d.id };
    await programar(
      antes,
      'Documento próximo a vencer',
      `Tu ${d.nombre} vence en ${diasAviso} días. Renuévalo a tiempo.`,
      datos,
    );
    await programar(vence, 'Documento vencido', `Tu ${d.nombre} vence hoy. Actualízalo en Mi perfil.`, datos);
  }
}

// Aviso inmediato (por ejemplo, al abrir la app con un documento ya vencido)
export async function notificarAhora(titulo, cuerpo, datos = {}) {
  await inmediata(titulo, cuerpo, datos);
}

// Recordatorios de reportes de actividad: se cancelan cuando el supervisor / SST apaga el GPS
export async function cancelarRecordatoriosReportes() {
  await cancelarPorTipo(['reporte', 'no_reporto']);
}

// Alarma al terminar la pausa (suena aunque la app esté cerrada)
export async function programarAlarmaPausa(pausa) {
  await prepararNotificaciones();
  await cancelarPorTipo(['fin_pausa']);
  await programar(
    new Date(pausa.finPrevisto),
    `Terminó tu ${pausa.texto.toLowerCase()}`,
    'Es hora de volver a tus actividades.',
    {
      tipo: 'fin_pausa',
    },
  );
}
export async function cancelarAlarmaPausa() {
  await cancelarPorTipo(['fin_pausa']);
}

// Recordatorios de pausa activa cada N minutos dentro del horario
export async function programarPausasActivas(inicio, fin, cadaMin) {
  await prepararNotificaciones();
  await cancelarPorTipo(['pausa_activa']);
  for (let t = new Date(inicio.getTime() + cadaMin * 60000); t < fin; t = new Date(t.getTime() + cadaMin * 60000)) {
    await programar(t, 'Hora de tu pausa activa', 'Estírate unos minutos. Márcala en Jornada → Pausas.', {
      tipo: 'pausa_activa',
    });
  }
}
