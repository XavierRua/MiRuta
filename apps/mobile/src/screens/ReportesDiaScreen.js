import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { useReportes } from '../context/ReportesContext';
import { useJornadaDia } from '../context/JornadaDiaContext';
import { useHorasExtra } from '../context/HorasExtraContext';
import { ahoraServidor } from '../services/horaServidor';
import { franjasDeSesion } from '../utils/horasExtra';
import { api } from '../services/api';
import { formatoDiaCorto } from '../utils/fechas';
import { hhmm } from '../utils/reportes';
import { nivelEficiencia, porcentaje } from '../utils/eficiencia';

// Reportes de actividad de un día (se abre desde Historial o desde Jornada)
export default function ReportesDiaScreen({ route }) {
  const fecha = new Date(route.params.fecha);
  const { reportes } = useReportes();
  const { sesiones } = useHorasExtra();
  const { dia } = useJornadaDia();
  // Horas extras de hoy: sus franjas también cuentan (las ya iniciadas)
  const ahora = ahoraServidor();
  const franjasExtra = sesiones.flatMap((x) => franjasDeSesion(x, ahora, reportes)).filter((f) => f.inicio <= ahora);
  // Con las pausas de hoy: las ventanas extendidas cierran más tarde y las cubiertas quedan "En pausa"
  const lista = api.getReportesDia(fecha, reportes, franjasExtra, dia.pausas);
  const cuentan = lista.filter((r) => r.estado !== 'en_pausa'); // "En pausa" no cuenta en la eficiencia
  const enviados = cuentan.filter((r) => r.estado !== 'no_reporto').length;
  const pct = porcentaje(enviados, cuentan.length);
  const nivel = nivelEficiencia(pct);

  return (
    <FlatList
      style={s.fondo}
      contentContainerStyle={s.contenido}
      data={lista}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <View style={s.cabecera}>
          <View style={{ flex: 1 }}>
            <Text style={s.titulo}>{formatoDiaCorto(fecha)}</Text>
            <Text style={s.hora}>
              {enviados} enviados · {lista.length - enviados} no reportó
            </Text>
          </View>
          <View style={[s.ef, { backgroundColor: nivel.fondo }]}>
            <Text style={[s.efValor, { color: nivel.color }]}>{pct == null ? '—' : `${pct} %`}</Text>
            <Text style={[s.efTexto, { color: nivel.color }]}>eficiencia</Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={s.vacio}>
          <Ionicons name="document-text-outline" size={32} color={color.suave} />
          <Text style={s.vacioTexto}>No hay reportes en este día.</Text>
        </View>
      }
      renderItem={({ item: r }) =>
        r.estado === 'en_pausa' ? (
          <View style={[s.tarjeta, s.tarjetaPausa]}>
            <View style={s.cab}>
              <View style={[s.selfie, s.selfiePausa]}>
                <Ionicons name="pause" size={18} color={color.morado} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.franja}>{r.franja}</Text>
                <Text style={s.hora}>Toda la hora en pausa: no necesitaba reporte ni cuenta en la eficiencia</Text>
              </View>
              <Text style={[s.estado, s.enPausa]}>En pausa – {r.pausa}</Text>
            </View>
          </View>
        ) : r.estado === 'no_reporto' ? (
          <View style={[s.tarjeta, s.tarjetaNo]}>
            <View style={s.cab}>
              <View style={[s.selfie, s.selfieNo]}>
                <Ionicons name="close" size={20} color={color.rojo} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.franja}>
                  {r.franja}
                  {r.extra ? <Text style={s.extra}> HORAS EXTRAS</Text> : null}
                </Text>
                <Text style={s.hora}>
                  No se envió el reporte en esta hora{r.extensionTexto ? ` (${r.extensionTexto.toLowerCase()})` : ''}
                </Text>
              </View>
              <Text style={[s.estado, s.noReporto]}>No reportó</Text>
            </View>
          </View>
        ) : (
          <View style={s.tarjeta}>
            <View style={s.cab}>
              {r.selfie ? (
                <Image source={{ uri: r.selfie.uri }} style={s.selfie} />
              ) : (
                <View style={[s.selfie, s.selfieVacia]}>
                  <Ionicons name="person" size={18} color={color.primario} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.franja}>
                  {r.franja}
                  {r.extra ? <Text style={s.extra}> HORAS EXTRAS</Text> : null}
                </Text>
                <Text style={s.hora}>
                  Enviado a las {hhmm(r.enviadoEn)}
                  {r.extensionTexto ? ` · ${r.extensionTexto}` : ''}
                </Text>
              </View>
              <Text style={[s.estado, s.aTiempo]}>Reportó</Text>
            </View>
            <Text style={s.descripcion}>{r.descripcion}</Text>
            {r.fotosTarea.length > 0 && (
              <View style={s.fotos}>
                {r.fotosTarea.map((f) => (
                  <Image key={f.uri} source={{ uri: f.uri }} style={s.foto} />
                ))}
              </View>
            )}
            <View style={s.ubic}>
              <Ionicons name="location" size={14} color={color.suave} />
              <Text style={s.ubicTexto}>
                {r.lugar ? `${r.lugar} · ` : ''}
                {r.ubicacion.direccion ?? `${r.ubicacion.lat.toFixed(5)}, ${r.ubicacion.lng.toFixed(5)}`}
              </Text>
            </View>
            {r.ejemplo && <Text style={s.ejemplo}>Reporte de ejemplo (sin fotos)</Text>}
          </View>
        )
      }
    />
  );
}

const s = StyleSheet.create({
  tarjetaPausa: { backgroundColor: color.moradoSuave },
  selfiePausa: { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  enPausa: { color: color.morado, backgroundColor: '#fff' },
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 20, gap: 12, paddingBottom: 40 },
  titulo: { fontSize: 18, fontWeight: '800', color: color.texto },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  ef: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  efValor: { fontSize: 20, fontWeight: '800' },
  efTexto: { fontSize: 11, fontWeight: '600' },
  vacio: { alignItems: 'center', gap: 8, padding: 30 },
  vacioTexto: { color: color.suave },
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: 14, padding: 14, gap: 10 },
  cab: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selfie: { width: 42, height: 42, borderRadius: 21 },
  selfieVacia: { backgroundColor: color.primarioSuave, alignItems: 'center', justifyContent: 'center' },
  extra: { color: color.morado, fontWeight: '800', fontSize: 11 },
  franja: { fontWeight: '700', color: color.texto },
  hora: { color: color.suave, fontSize: 13 },
  estado: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  aTiempo: { backgroundColor: color.verdeSuave, color: color.verde },
  noReporto: { backgroundColor: color.rojoSuave, color: color.rojo },
  tarjetaNo: { borderWidth: 1, borderColor: '#fecaca' },
  selfieNo: { backgroundColor: color.rojoSuave, alignItems: 'center', justifyContent: 'center' },
  descripcion: { color: color.texto, lineHeight: 20 },
  fotos: { flexDirection: 'row', gap: 8 },
  foto: { width: 80, height: 80, borderRadius: 10 },
  ubic: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ubicTexto: { flex: 1, color: color.suave, fontSize: 12 },
  ejemplo: { color: color.suave, fontSize: 11, fontStyle: 'italic' },
});
