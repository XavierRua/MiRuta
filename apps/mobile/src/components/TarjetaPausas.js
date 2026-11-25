import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { useJornadaDia } from '../context/JornadaDiaContext';
import { usePermisos } from '../context/PermisosContext';
import { hhmm } from '../utils/reportes';
import { textoDuracion } from '../config/formularios';
import Dato from './Dato';

// Pausas de descanso y actividades autorizadas, con el diseño de "Indicadores diarios".
// - Descansos (desayuno, almuerzo, pausa activa): los inicia el trabajador; se cierran solos con alarma.
// - Actividades autorizadas (capacitación, reunión, cita médica…): solo aparecen si un perfil autorizado se las
//   habilitó para hoy en la web. Tiempo asignado: alarma y cierre automático. Tiempo libre: cronómetro.
// Mientras dure una pausa, el reporte de actividad se desactiva y su ventana se extiende (utils/pausas.js).
const TONO = { color: color.morado, fondo: color.moradoSuave };
const minutosEntre = (a, b) => Math.max(0, Math.round((b - new Date(a)) / 60000));

export default function TarjetaPausas({ ahora, ancho }) {
  const { tiposPausa, actividades, pausaActiva, iniciarPausa, iniciarActividad, cerrarPausa, dia, usoDescanso } =
    useJornadaDia();
  const terminadas = dia.pausas.filter((p) => p.fin);
  const { puede } = usePermisos();

  const avisarSiOcupado = () => {
    if (!pausaActiva) return false;
    Alert.alert('Ya tienes una en curso', `Termina ${pausaActiva.texto.toLowerCase()} antes de iniciar otra.`);
    return true;
  };
  const conError = (fn) => fn().catch((e) => Alert.alert('No se pudo iniciar', e.message));

  const iniciarDescanso = (t) => {
    if (avisarSiOcupado()) return;
    const uso = usoDescanso(t, ahora);
    const bolsa = t.bolsaMin != null;
    const dura = bolsa ? Math.min(t.minutos, uso.restanteMin) : t.minutos;
    Alert.alert(
      `Iniciar ${t.texto.toLowerCase()}`,
      `${
        bolsa
          ? `Te quedan ${textoDuracion(uso.restanteMin)} de pausa activa hoy. Esta puede durar hasta ${textoDuracion(dura)}; si la terminas antes, lo que no uses queda en tu bolsa.`
          : `Dura ${textoDuracion(dura)} y solo se puede tomar ${t.veces === 1 ? 'una vez' : `${t.veces} veces`} al día.`
      } Se cerrará sola y sonará una alarma. Mientras dure no se pide el reporte y su hora se extiende por el tiempo de la pausa.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar', onPress: () => conError(() => iniciarPausa(t)) },
      ],
    );
  };

  const iniciarAutorizada = (a) => {
    if (avisarSiOcupado()) return;
    Alert.alert(
      `Iniciar ${a.texto.toLowerCase()}`,
      `${a.modo === 'asignado' ? `Tiempo asignado: ${textoDuracion(a.minutos)}. Se cerrará sola y sonará una alarma.` : 'Tiempo libre: corre un cronómetro y tú la terminas.'}${a.nota ? `\n\n${a.nota}` : ''}\n\nAutorizó: ${a.autorizadaPor}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar', onPress: () => conError(() => iniciarActividad(a)) },
      ],
    );
  };

  const terminar = () => {
    const libre = !pausaActiva.finPrevisto;
    const bolsa = pausaActiva.tipo === 'pausa_activa';
    Alert.alert(
      `Terminar ${pausaActiva.texto.toLowerCase()}`,
      libre
        ? '¿Ya terminaste? Se detendrá el cronómetro.'
        : bolsa
          ? '¿Terminaste tu pausa activa? Los minutos que no usaste quedan en tu bolsa para más tarde.'
          : '¿Quieres volver al trabajo antes de tiempo? El tiempo que no uses no se guarda.',
      [
        { text: libre ? 'Seguir' : 'Seguir en pausa', style: 'cancel' },
        { text: libre ? 'Terminar' : 'Volver al trabajo', onPress: () => cerrarPausa(true) },
      ],
    );
  };

  // ---------- Tarjetas de descanso ----------
  const tarjetaDescanso = (t) => {
    const activa = pausaActiva?.clase !== 'actividad' && pausaActiva?.tipo === t.id ? pausaActiva : null;
    const hechas = terminadas.filter((p) => p.tipo === t.id);
    const ultima = hechas[hechas.length - 1];
    const uso = usoDescanso(t, ahora);
    const bolsa = t.bolsaMin != null;
    const agotada = uso.agotado && !activa;
    const restan = activa ? Math.max(0, Math.ceil((new Date(activa.finPrevisto) - ahora) / 60000)) : 0;
    return (
      <Dato
        key={t.id}
        ancho={ancho}
        icono={t.icono ?? 'pause'}
        tono={activa || ultima ? TONO : undefined}
        activo={!!activa}
        valor={textoDuracion(activa ? restan : bolsa ? uso.restanteMin : t.minutos)}
        texto={t.texto}
        detalle={
          activa
            ? bolsa
              ? 'En curso · toca para terminar'
              : 'En curso · toca para volver'
            : bolsa
              ? agotada
                ? `Usaste tus ${t.bolsaMin} min de hoy`
                : `Te quedan hoy (máx. ${t.minutos} por pausa)`
              : agotada && ultima
                ? `Ya la tomaste ${hhmm(new Date(ultima.inicio))}–${hhmm(new Date(ultima.fin))}`
                : 'Toca para iniciar'
        }
        onPress={activa ? terminar : agotada ? undefined : () => iniciarDescanso(t)}
      />
    );
  };

  // ---------- Tarjetas de actividades autorizadas ----------
  const tarjetaActividad = (a) => {
    const registro = dia.pausas.find((p) => p.actividadId === a.id);
    const activa = registro && !registro.fin ? registro : null;
    const hecha = registro?.fin ? registro : null;
    const valor = activa
      ? activa.finPrevisto
        ? textoDuracion(Math.max(0, Math.ceil((new Date(activa.finPrevisto) - ahora) / 60000)))
        : textoDuracion(minutosEntre(activa.inicio, ahora)) // cronómetro
      : hecha
        ? textoDuracion(minutosEntre(hecha.inicio, new Date(hecha.fin)))
        : a.modo === 'asignado'
          ? textoDuracion(a.minutos)
          : 'Libre';
    return (
      <Dato
        key={a.id}
        ancho={ancho}
        icono={a.icono ?? 'checkmark-circle'}
        tono={activa || hecha ? TONO : undefined}
        activo={!!activa}
        valor={valor}
        texto={a.texto}
        detalle={
          activa
            ? activa.finPrevisto
              ? 'Faltan · toca para terminar'
              : 'Cronómetro · toca para terminar'
            : hecha
              ? `Hecha ${hhmm(new Date(hecha.inicio))}–${hhmm(new Date(hecha.fin))}`
              : `Autorizó ${a.autorizadaPor.split(' (')[0]}`
        }
        onPress={activa ? terminar : hecha ? undefined : () => iniciarAutorizada(a)}
      />
    );
  };

  return (
    <View style={s.seccion}>
      <View style={s.cab}>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo}>Pausas y descansos</Text>
          <Text style={s.sub}>
            {pausaActiva
              ? pausaActiva.finPrevisto
                ? `${pausaActiva.texto} hasta las ${hhmm(new Date(pausaActiva.finPrevisto))} · sonará una alarma`
                : `${pausaActiva.texto} desde las ${hhmm(new Date(pausaActiva.inicio))} · tiempo libre`
              : 'Toca una tarjeta para iniciarla. Se cierra sola al cumplir el tiempo.'}
          </Text>
        </View>
        <View style={[s.chip, pausaActiva && { backgroundColor: color.moradoSuave }]}>
          <Ionicons
            name={pausaActiva ? 'pause-circle' : 'checkmark-circle'}
            size={15}
            color={pausaActiva ? color.morado : color.suave}
          />
          <Text style={[s.chipTexto, pausaActiva && { color: color.morado }]}>
            {pausaActiva ? 'En pausa' : `${terminadas.length} hoy`}
          </Text>
        </View>
      </View>

      <View style={s.grilla}>{tiposPausa.map(tarjetaDescanso)}</View>

      {/* Solo aparecen cuando las habilitan en la web para este trabajador y esta fecha */}
      {puede('actividades.usar') && actividades.length > 0 && (
        <>
          <View style={s.cab}>
            <View style={{ flex: 1 }}>
              <Text style={s.titulo}>Actividades autorizadas</Text>
              <Text style={s.sub}>Habilitadas para hoy. Mientras duren, tu reporte se extiende.</Text>
            </View>
          </View>
          <View style={s.grilla}>{actividades.map(tarjetaActividad)}</View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  seccion: { gap: 12 },
  cab: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  titulo: { fontSize: 18, fontWeight: '800', color: color.texto },
  sub: { color: color.suave, fontSize: 12, marginTop: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: color.tarjeta,
  },
  chipTexto: { fontSize: 12, fontWeight: '700', color: color.suave },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
