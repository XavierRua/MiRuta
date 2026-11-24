// Notificaciones locales del reporte de actividad.
// Las programa el propio celular, así que suenan y vibran aunque la app esté cerrada o en segundo plano
// (también sin internet). Las horas se calculan con la hora del servidor.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { REPORTES } from '../config/reportes';
import { hhmm } from '../utils/reportes';
import { aRelojDelCelular, ahoraServidor } from './horaServidor';

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

async function programar(fechaServidor, titulo, cuerpo, datos) {
  if (fechaServidor <= ahoraServidor()) return null;
  return Notifications.scheduleNotificationAsync({
    content: contenido(titulo, cuerpo, datos),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: aRelojDelCelular(fechaServidor), // suena a la hora real aunque el reloj del celular esté mal
      channelId: CANAL,
    },
  });
}

// Programa, para cada hora sin reporte:
// 1. al abrir la hora: "Ya puedes enviar tu reporte"
// 2. 10 minutos antes de cerrar: "Te quedan 10 minutos"
// 3. al cerrar la hora: "No reportaste" (se cancela si envía el reporte)
export async function programarRecordatorios(franjas, reportes) {
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
      programar(
        f.inicio,
        'Ya puedes enviar tu reporte',
        `Tienes hasta las ${hhmm(cierre)} para reportar ${f.etiqueta}.`,
        datos,
      ),
      programar(
        aviso,
        `Te quedan ${REPORTES.avisoAntesDeCerrarMin} minutos`,
        `Envía tu reporte de ${f.etiqueta} antes de que cierre la hora.`,
        datos,
      ),
      programar(
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
  await Promise.all((programadas[franjaId] ?? []).map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  delete programadas[franjaId];
}

export async function notificarEnviado(etiqueta) {
  await Notifications.scheduleNotificationAsync({
    content: contenido('Reporte enviado', `Tu reporte de ${etiqueta} quedó registrado.`, { tipo: 'enviado' }),
    trigger: Platform.OS === 'android' ? { channelId: CANAL } : null, // inmediata
  });
}

// Aviso con sonido cuando el administrador asigna, cambia o cancela una visita.
// Con Supabase lo envía el servidor como notificación push; en la demo se genera aquí.
export async function notificarVisita(titulo, cuerpo) {
  await prepararNotificaciones();
  await Notifications.scheduleNotificationAsync({
    content: contenido(titulo, cuerpo, { tipo: 'visita' }),
    trigger: Platform.OS === 'android' ? { channelId: CANAL } : null,
  });
}

// Cancela las notificaciones programadas de ciertos tipos (datos.tipo)
async function cancelarPorTipo(tipos) {
  const todas = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    todas
      .filter((n) => tipos.includes(n.content?.data?.tipo))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
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
  await Notifications.scheduleNotificationAsync({
    content: contenido(titulo, cuerpo, datos),
    trigger: Platform.OS === 'android' ? { channelId: CANAL } : null,
  });
}
