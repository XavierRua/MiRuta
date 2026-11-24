import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import Dato from '../components/Dato';
import TarjetaReportes from '../components/TarjetaReportes';
import TarjetaHorasExtra from '../components/TarjetaHorasExtra';
import TarjetaVisitas from '../components/TarjetaVisitas';
import { useVisitas } from '../context/VisitasContext';
import { estadoVisita } from '../utils/visitas';
import { useFranjasHoy } from '../hooks/useFranjasHoy';
import { prepararNotificaciones, programarRecordatorios } from '../services/notificaciones';
import { api } from '../services/api';
import { franjasDelDia } from '../utils/reportes';
import { useVelocidad } from '../hooks/useVelocidad';
import { eficienciaHoy, nivelEficiencia } from '../utils/eficiencia';
import { nivelVelocidad } from '../utils/velocidad';
import { useJornada } from '../hooks/useJornada';
import { formatoKm } from '../utils/formato';
export default function JornadaScreen({ navigation }) {
  const { yo, horario, hoy } = useJornada();
  const { franjas, conEstado, franjasRecordatorio, reportes, ahora, horaVerificada, desfaseMin } = useFranjasHoy();
  const cfg = api.getIndicadores();

  // Eficiencia del día: se recalcula al enviar un reporte o cuando una hora queda "No reportó"
  const ef = eficienciaHoy(conEstado);
  const nivelEf = nivelEficiencia(ef.pct, cfg);

  // Velocidad en tiempo real (solo con esta pantalla abierta)
  const enPantalla = useIsFocused();
  const { kmh, error: errorGps, resumen } = useVelocidad(enPantalla);
  const nivelVel = nivelVelocidad(kmh, cfg);

  // Visitas programadas por el administrador: cumplidas / total
  const { visitasHoy, registros } = useVisitas();
  const finHoy = api.getHorarioDia(ahora)?.fin;
  const cumplidas = visitasHoy.filter(
    (p) => estadoVisita(p, registros[p.id], ahora, finHoy).estado === 'cumplida',
  ).length;

  // Grilla: 2 columnas en celulares, 4 en pantallas anchas (tablet o celular horizontal)
  const { width } = useWindowDimensions();
  const columnas = width >= 560 ? 4 : 2;
  const ancho = Math.floor((width - 40 - 12 * (columnas - 1)) / columnas);

  // Recordatorios cada hora en este celular (se reprograman al enviar un reporte)
  useEffect(() => {
    prepararNotificaciones()
      .then((ok) => {
        if (!ok) return;
        // Hoy y mañana, para que suene aunque el trabajador no abra la app mañana
        const manana = new Date(ahora);
        manana.setDate(manana.getDate() + 1);
        // Incluye las horas extras activas; al finalizarlas se reprograma sin ellas
        return programarRecordatorios(
          [...franjasRecordatorio, ...franjasDelDia(manana, api.getHorarioDia(manana))],
          reportes,
        );
      })
      .catch(() => {});
  }, [franjasRecordatorio.map((f) => f.id).join(','), reportes.length, horaVerificada]);

  const abrirReporte = (f) =>
    navigation.navigate('NuevoReporte', {
      franja: {
        id: f.id,
        etiqueta: f.etiqueta,
        inicio: f.inicio.toISOString(),
        fin: f.fin.toISOString(),
        cierre: f.cierre?.toISOString(),
        extra: !!f.extra,
        demo: !!f.demo,
      },
    });
  return (
    <SafeAreaView style={s.fondo} edges={['top']}>
      <ScrollView contentContainerStyle={s.contenido}>
        <Text style={s.saludo}>Hola, {yo.nombres}</Text>
        <Text style={s.empresa}>{yo.empresa}</Text>

        {/* Estado del rastreo: automático, sin botones */}
        <View style={s.estado}>
          <View style={s.estadoFila}>
            <View style={s.pulso}>
              <View style={s.punto} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.estadoTitulo}>Jornada activa</Text>
              <Text style={s.estadoSub}>Compartiendo ubicación · automático</Text>
            </View>
          </View>
          <View style={s.horario}>
            <Ionicons name="time-outline" size={16} color="#fff" />
            <Text style={s.horarioTexto}>Horario de hoy: {horario.hoy}</Text>
          </View>
          <Text style={s.estadoNota}>El rastreo se apagará solo a las 5:00 p. m. No tienes que hacer nada.</Text>
        </View>

        <TarjetaHorasExtra ahora={ahora} horaVerificada={horaVerificada} />

        <TarjetaReportes
          franjas={franjas}
          conEstado={conEstado}
          reportes={reportes}
          ahora={ahora}
          horaVerificada={horaVerificada}
          desfaseMin={desfaseMin}
          onEnviar={abrirReporte}
        />
        {reportes.length > 0 && (
          <Pressable
            style={s.verReportes}
            onPress={() => navigation.navigate('ReportesDia', { fecha: new Date().toISOString() })}
          >
            <Text style={s.verReportesTexto}>Ver mis reportes de hoy</Text>
            <Ionicons name="chevron-forward" size={16} color={color.primario} />
          </Pressable>
        )}

        {/* Último envío, puntos sin enviar y batería solo los ve el administrador (panel web) */}
        <View style={s.grilla}>
          <Dato
            ancho={ancho}
            icono="map"
            valor={formatoKm(hoy.km)}
            texto="Recorrido hoy"
            detalle={`Desde las ${hoy.inicio}`}
          />
          <Dato
            ancho={ancho}
            icono="location"
            valor={visitasHoy.length ? `${cumplidas}/${visitasHoy.length}` : '0'}
            texto="Visitas hoy"
            detalle={visitasHoy.length ? 'Cumplidas / programadas' : 'Sin visitas programadas'}
          />
          <Dato
            ancho={ancho}
            icono="checkmark-done"
            tono={nivelEf}
            valor={ef.pct == null ? '—' : `${ef.pct} %`}
            texto="Eficiencia del día"
            detalle={ef.esperados ? `${ef.enviados} de ${ef.esperados} reportes` : 'Aún sin reportes'}
          />
          <Dato
            ancho={ancho}
            icono="speedometer"
            tono={
              kmh == null
                ? undefined
                : { ...nivelVel, detalleColor: kmh > cfg.limiteVelocidad ? color.rojo : undefined }
            }
            valor={kmh == null ? '— km/h' : `${kmh} km/h`}
            texto="Velocidad"
            detalle={
              errorGps ??
              (kmh != null && kmh > cfg.limiteVelocidad ? 'Exceso registrado' : `Límite ${cfg.limiteVelocidad} km/h`)
            }
          />
        </View>
        {resumen.max > 0 && (
          <Text style={s.resumenVel}>
            Hoy: velocidad promedio {resumen.promedio ?? '—'} km/h · máxima {resumen.max} km/h
          </Text>
        )}

        <TarjetaVisitas ahora={ahora} navigation={navigation} />

        <View style={s.aviso}>
          <Ionicons name="information-circle" size={18} color={color.ambar} />
          <Text style={s.avisoTexto}>
            Si no tienes señal, MiRuta guarda tu recorrido y lo envía cuando vuelva la conexión.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  verReportes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: -4 },
  verReportesTexto: { color: color.primario, fontWeight: '600' },
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 20, gap: 12 },
  saludo: { fontSize: 26, fontWeight: '800', color: color.texto },
  empresa: { color: color.suave, marginTop: -8, marginBottom: 6 },
  estado: { backgroundColor: color.verde, borderRadius: 20, padding: 18, gap: 12 },
  estadoFila: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pulso: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  punto: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  estadoTitulo: { color: '#fff', fontSize: 20, fontWeight: '800' },
  estadoSub: { color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  horario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 10,
    padding: 10,
  },
  horarioTexto: { color: '#fff', fontWeight: '600' },
  estadoNota: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  fila: { flexDirection: 'row', gap: 12 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  resumenVel: { color: color.suave, fontSize: 12, textAlign: 'center', marginTop: -4 },
  dato: { flex: 1, backgroundColor: color.tarjeta, borderRadius: 16, padding: 14, gap: 4 },
  datoValor: { fontSize: 20, fontWeight: '800', color: color.texto, marginTop: 4 },
  datoTexto: { color: color.suave, fontSize: 13 },
  aviso: { flexDirection: 'row', gap: 8, backgroundColor: color.ambarSuave, borderRadius: 12, padding: 12 },
  avisoTexto: { flex: 1, color: color.ambar, fontSize: 13, lineHeight: 18 },
});
