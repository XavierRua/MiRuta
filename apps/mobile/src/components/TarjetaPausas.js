import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { useJornadaDia } from '../context/JornadaDiaContext';
import { hhmm } from '../utils/reportes';
import { duracionMin, textoDuracion } from '../config/formularios';
import Dato from './Dato';

// Pausas y descansos, con el mismo diseño de "Indicadores diarios": título de sección y una grilla de
// tarjetas (círculo con ícono, valor, título y detalle). Se toca la tarjeta para iniciar la pausa; se cierra
// sola al cumplirse el tiempo configurado por el administrador, con una alarma, y queda en el historial.
const TONO = { color: color.morado, fondo: color.moradoSuave };

export default function TarjetaPausas({ ahora, ancho }) {
  const { tiposPausa, pausaActiva, iniciarPausa, cerrarPausa, dia } = useJornadaDia();
  const [otras, setOtras] = useState(false);
  const terminadas = dia.pausas.filter((p) => p.fin);
  const tipoOtras = tiposPausa.find((t) => t.opciones);

  const iniciar = (tipo, opcion) => {
    if (pausaActiva) {
      Alert.alert('Ya tienes una pausa en curso', `Termina ${pausaActiva.texto.toLowerCase()} antes de iniciar otra.`);
      return;
    }
    const nombre = (opcion ?? tipo).texto;
    Alert.alert(
      `Iniciar ${nombre.toLowerCase()}`,
      `Dura ${textoDuracion(duracionMin(opcion ?? tipo))}. Se cerrará sola y sonará una alarma al terminar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar', onPress: () => iniciarPausa(tipo, opcion).then(() => setOtras(false)) },
      ],
    );
  };

  const volverAntes = () =>
    Alert.alert(`Terminar ${pausaActiva.texto.toLowerCase()}`, '¿Quieres volver al trabajo antes de tiempo?', [
      { text: 'Seguir en pausa', style: 'cancel' },
      { text: 'Volver al trabajo', onPress: () => cerrarPausa(true) },
    ]);

  const restan = pausaActiva ? Math.max(0, Math.ceil((new Date(pausaActiva.finPrevisto) - ahora) / 60000)) : 0;

  // Detalle de cada tarjeta: la pausa en curso, la última hecha hoy o la invitación a tocarla
  const ultimaDe = (id, opcionId) =>
    terminadas.filter((p) => p.tipo === id && (!opcionId || p.opcion === opcionId)).pop();
  const esActiva = (id, opcionId) =>
    pausaActiva && pausaActiva.tipo === id && (!opcionId || pausaActiva.opcion === opcionId);

  const tarjeta = (t, o) => {
    const activa = esActiva(t.id, o?.id);
    const ultima = ultimaDe(t.id, o?.id);
    return (
      <Dato
        key={o?.id ?? t.id}
        ancho={ancho}
        icono={(o ?? t).icono ?? 'pause'}
        tono={activa || ultima ? TONO : undefined}
        activo={activa}
        valor={textoDuracion(activa ? restan : duracionMin(o ?? t))}
        texto={(o ?? t).texto}
        detalle={
          activa
            ? 'En curso · toca para volver'
            : ultima
              ? `Hecha ${hhmm(new Date(ultima.inicio))}–${hhmm(new Date(ultima.fin))}`
              : 'Toca para iniciar'
        }
        onPress={activa ? volverAntes : () => iniciar(t, o)}
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
              ? `${pausaActiva.texto} hasta las ${hhmm(new Date(pausaActiva.finPrevisto))} · sonará una alarma`
              : otras
                ? 'Elige el motivo de la pausa'
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

      <View style={s.grilla}>
        {otras
          ? tipoOtras.opciones.map((o) => tarjeta(tipoOtras, o))
          : tiposPausa.map((t) =>
              t.opciones && !esActiva(t.id) ? (
                <Dato
                  key={t.id}
                  ancho={ancho}
                  icono={t.icono}
                  tono={ultimaDe(t.id) ? TONO : undefined}
                  valor={`${t.opciones.length} tipos`}
                  texto={t.texto}
                  detalle={t.opciones.map((o) => o.texto).join(', ')}
                  onPress={() => (pausaActiva ? iniciar(t) : setOtras(true))}
                />
              ) : (
                tarjeta(t, t.opciones && pausaActiva ? t.opciones.find((o) => o.id === pausaActiva.opcion) : undefined)
              ),
            )}
      </View>
      {otras && (
        <Pressable onPress={() => setOtras(false)} style={s.volver}>
          <Ionicons name="chevron-back" size={16} color={color.primario} />
          <Text style={s.volverTexto}>Volver a las pausas</Text>
        </Pressable>
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
  volver: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4 },
  volverTexto: { color: color.primario, fontWeight: '700' },
});
