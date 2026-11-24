import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { config } from '../config/app';
import { HORA_SERVIDOR } from '../config/reportes';
import { cierreJornada, franjaParaEnviar, hhmm, minutosRestantes } from '../utils/reportes';
import { useHorasExtra } from '../context/HorasExtraContext';
import { api } from '../services/api';

const info = {
  enviado: { icono: 'checkmark-circle', color: color.verde, texto: 'Enviado' },
  disponible: { icono: 'time', color: color.ambar, texto: 'Envíalo ahora' },
  no_reporto: { icono: 'close-circle', color: color.rojo, texto: 'No reportó' },
  proximo: { icono: 'ellipse-outline', color: color.suave, texto: 'Próximo' },
  excluida: { icono: 'school', color: color.morado, texto: 'No aplica (capacitación)' },
};

// Tarjeta de la pantalla Jornada: reportes de hoy y botón para enviar el de la hora actual
export default function TarjetaReportes({ franjas, conEstado, reportes, ahora, horaVerificada, desfaseMin, onEnviar }) {
  const horarioHoy = api.getHorarioDia(ahora); // horario que configuró el administrador
  const siguiente = franjaParaEnviar(franjas, reportes, config.modoDemo, ahora, !!horarioHoy);
  // Jornada finalizada: pasó el fin del horario + la hora de más, y no hay horas extras activas
  const { activa: extraActiva } = useHorasExtra();
  const cierre = cierreJornada(ahora, horarioHoy);
  const jornadaFinalizada = !!cierre && ahora >= cierre && !extraActiva;
  const enviados = conEstado.filter((f) => f.estado === 'enviado').length;
  const noReporto = conEstado.filter((f) => f.estado === 'no_reporto').length;
  const restan = siguiente ? minutosRestantes(siguiente, ahora) : 0;
  const proxima = conEstado.find((f) => f.estado === 'proximo');

  return (
    <View style={s.tarjeta}>
      <View style={s.cab}>
        <Text style={s.titulo}>Reportes de actividad</Text>
        <Text style={s.contador}>
          {enviados} / {franjas.length || '—'}
        </Text>
      </View>
      <Text style={s.sub}>
        Cada reporte se envía dentro de su hora: el de las 9:00, entre 9:00 y 9:59. Hora oficial: {hhmm(ahora)}
      </Text>

      {!horaVerificada && (
        <View style={s.aviso}>
          <Ionicons name="cloud-offline" size={18} color={color.rojo} />
          <Text style={s.avisoTexto}>
            Sin conexión: no podemos verificar la hora. Conéctate para enviar tu reporte.
          </Text>
        </View>
      )}
      {horaVerificada && Math.abs(desfaseMin) >= HORA_SERVIDOR.maxDesfaseMin && (
        <View style={s.aviso}>
          <Ionicons name="warning" size={18} color={color.rojo} />
          <Text style={s.avisoTexto}>
            La hora de tu celular está {desfaseMin > 0 ? 'adelantada' : 'atrasada'} {Math.abs(desfaseMin)} min. MiRuta
            usa la hora oficial.
          </Text>
        </View>
      )}

      {jornadaFinalizada && !siguiente ? (
        <View style={[s.boton, s.botonOff, s.finalizada]}>
          <Ionicons name="lock-closed" size={20} color="#fff" />
          <View style={{ alignItems: 'center' }}>
            <Text style={s.botonTexto}>Jornada finalizada</Text>
            <Text style={s.botonSub}>No se pueden enviar más reportes. (Cerró a las {hhmm(cierre)})</Text>
          </View>
        </View>
      ) : siguiente ? (
        <Pressable
          style={[s.boton, restan <= 10 && s.botonUrgente, !horaVerificada && s.botonOff]}
          disabled={!horaVerificada}
          onPress={() => onEnviar(siguiente)}
        >
          <Ionicons name="camera" size={20} color="#fff" />
          <View style={{ alignItems: 'center' }}>
            <Text style={s.botonTexto}>Enviar reporte {siguiente.etiqueta}</Text>
            <Text style={s.botonSub}>Cierra en {restan} min</Text>
          </View>
        </Pressable>
      ) : (
        <View style={s.alDia}>
          <Ionicons name="checkmark-done" size={18} color={color.verde} />
          <Text style={s.alDiaTexto}>
            {proxima
              ? `Tu próximo reporte se habilita a las ${hhmm(proxima.inicio)}.`
              : cierre && !extraActiva
                ? `No tienes reportes pendientes. Los reportes de hoy cierran a las ${hhmm(cierre)}.`
                : 'No tienes reportes pendientes.'}
          </Text>
        </View>
      )}

      {noReporto > 0 && (
        <Text style={s.noReporto}>
          {noReporto} {noReporto === 1 ? 'hora' : 'horas'} sin reporte hoy. Ya no se pueden enviar.
        </Text>
      )}

      {conEstado.length > 0 && (
        <View style={s.lista}>
          {conEstado.map((f) => {
            const i = info[f.estado];
            return (
              <View key={f.id} style={s.fila}>
                <Ionicons name={i.icono} size={18} color={i.color} />
                <Text style={s.franja}>
                  {f.etiqueta}
                  {f.extra ? <Text style={s.extra}> EXTRA</Text> : null}
                </Text>
                <Text style={[s.estado, { color: i.color }]}>{i.texto}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  finalizada: { backgroundColor: color.suave },
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: 16, padding: 16, gap: 10 },
  cab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontWeight: '700', fontSize: 16, color: color.texto },
  contador: { fontWeight: '800', color: color.primario },
  sub: { color: color.suave, fontSize: 13, marginTop: -4, lineHeight: 18 },
  aviso: { flexDirection: 'row', gap: 8, backgroundColor: color.rojoSuave, borderRadius: 10, padding: 10 },
  avisoTexto: { flex: 1, color: color.rojo, fontSize: 13, lineHeight: 18 },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: color.primario,
    borderRadius: 12,
    paddingVertical: 12,
  },
  botonUrgente: { backgroundColor: color.rojo },
  botonOff: { opacity: 0.4 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  botonSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  alDia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: color.verdeSuave,
    borderRadius: 10,
    padding: 10,
  },
  alDiaTexto: { flex: 1, color: color.verde, fontWeight: '600' },
  noReporto: { color: color.rojo, fontSize: 13, fontWeight: '600' },
  lista: { gap: 8, marginTop: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  franja: { flex: 1, color: color.texto, fontVariant: ['tabular-nums'] },
  extra: { color: color.morado, fontWeight: '800', fontSize: 11 },
  estado: { fontSize: 13, fontWeight: '600' },
});
