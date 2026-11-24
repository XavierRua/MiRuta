import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { config } from '../config/app';
import { HORAS_EXTRA } from '../config/horasExtra';
import { useHorasExtra } from '../context/HorasExtraContext';
import { api } from '../services/api';
import { duracionMs, formatoDuracion, puedeIniciarExtra } from '../utils/horasExtra';
import { hhmm } from '../utils/reportes';

// Tarjeta de la pestaña Jornada para iniciar y finalizar horas extras
export default function TarjetaHorasExtra({ ahora, horaVerificada }) {
  const { sesiones, activa, iniciar, finalizar } = useHorasExtra();
  const [ocupado, setOcupado] = useState(false);
  const permiso = puedeIniciarExtra(ahora, api.getHorarioDia(ahora), config.modoDemo);
  const totalHoy = sesiones.reduce((s, x) => s + duracionMs(x, ahora), 0);
  const pasoMaximo = totalHoy >= HORAS_EXTRA.maxHorasDia * 3600000;

  const ejecutar = async (accion) => {
    try {
      setOcupado(true);
      await accion();
    } catch (e) {
      Alert.alert('No se pudo completar', e.message);
    } finally {
      setOcupado(false);
    }
  };

  const confirmarFin = () =>
    Alert.alert(
      'Finalizar horas extras',
      `Llevas ${formatoDuracion(duracionMs(activa, ahora))}. ¿Quieres finalizarlas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Finalizar', style: 'destructive', onPress: () => ejecutar(finalizar) },
      ],
    );

  return (
    <View style={[s.tarjeta, activa && s.tarjetaActiva]}>
      <View style={s.cab}>
        <View style={s.icono}>
          <Ionicons name="moon" size={20} color={color.morado} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo}>Horas extras</Text>
          <Text style={s.sub}>
            {activa
              ? `En curso desde las ${hhmm(new Date(activa.inicio))} (hora oficial)`
              : permiso.ok
                ? (permiso.aviso ?? 'Tu jornada terminó. Puedes iniciar horas extras.')
                : permiso.motivo}
          </Text>
        </View>
        {activa && <Text style={s.cronometro}>{formatoDuracion(duracionMs(activa, ahora))}</Text>}
      </View>

      {activa && (
        <Text style={s.nota}>
          Mientras estén activas debes enviar tu reporte de actividad cada hora, con las mismas reglas de la jornada.
        </Text>
      )}
      {pasoMaximo && (
        <Text style={s.alerta}>
          Ya sumas {formatoDuracion(totalHoy)} hoy. El máximo definido es {HORAS_EXTRA.maxHorasDia} h diarias.
        </Text>
      )}

      {activa ? (
        <Pressable style={[s.boton, s.botonFin]} disabled={ocupado || !horaVerificada} onPress={confirmarFin}>
          {ocupado ? (
            <ActivityIndicator color={color.morado} />
          ) : (
            <Ionicons name="stop-circle" size={20} color={color.morado} />
          )}
          <Text style={[s.botonTexto, { color: color.morado }]}>Finalizar horas extras</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[s.boton, (!permiso.ok || !horaVerificada) && s.botonOff]}
          disabled={!permiso.ok || !horaVerificada || ocupado}
          onPress={() => ejecutar(iniciar)}
        >
          {ocupado ? <ActivityIndicator color="#fff" /> : <Ionicons name="play-circle" size={20} color="#fff" />}
          <Text style={s.botonTexto}>Iniciar horas extras</Text>
        </Pressable>
      )}

      {sesiones.filter((x) => x.fin).length > 0 && (
        <View style={s.lista}>
          {sesiones
            .filter((x) => x.fin)
            .map((x) => (
              <View key={x.id} style={s.fila}>
                <Ionicons name="checkmark-circle" size={16} color={color.morado} />
                <Text style={s.filaTexto}>
                  {hhmm(new Date(x.inicio))} – {hhmm(new Date(x.fin))}
                </Text>
                <Text style={s.filaValor}>{formatoDuracion(duracionMs(x, ahora))}</Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: 16, padding: 16, gap: 10 },
  tarjetaActiva: { borderWidth: 2, borderColor: color.morado },
  cab: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.moradoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontWeight: '700', fontSize: 16, color: color.texto },
  sub: { color: color.suave, fontSize: 13, marginTop: 2, lineHeight: 18 },
  cronometro: { fontWeight: '800', fontSize: 16, color: color.morado },
  nota: { color: color.suave, fontSize: 12, lineHeight: 17 },
  alerta: { color: color.rojo, fontSize: 13, fontWeight: '600' },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: color.morado,
    borderRadius: 12,
    paddingVertical: 14,
  },
  botonFin: { backgroundColor: color.moradoSuave, borderWidth: 1, borderColor: color.morado },
  botonOff: { opacity: 0.4 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  lista: { gap: 6, borderTopWidth: 1, borderTopColor: color.borde, paddingTop: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filaTexto: { flex: 1, color: color.texto },
  filaValor: { color: color.morado, fontWeight: '700' },
});
