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
import TarjetaPausas from '../components/TarjetaPausas';
import TarjetaIncidentes from '../components/TarjetaIncidentes';
import { REGLAS_JORNADA } from '../config/formularios';
import { enColombia } from '../utils/horaColombia';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDesplazamiento } from '../context/DesplazamientoContext';
import { useJornadaDia } from '../context/JornadaDiaContext';
import { infoModo, kmTexto, textoMin } from '../utils/desplazamiento';
import { useVisitas } from '../context/VisitasContext';
import { estadoVisita } from '../utils/visitas';
import { useFranjasHoy } from '../hooks/useFranjasHoy';
import { prepararNotificaciones, programarRecordatorios } from '../services/notificaciones';
import { api } from '../services/api';
import { franjasDelDia } from '../utils/reportes';
import { textoExtension, tramosDePausas } from '../utils/pausas';
import { useVelocidad } from '../hooks/useVelocidad';
import { eficienciaHoy, nivelEficiencia } from '../utils/eficiencia';
import { nivelVelocidad } from '../utils/velocidad';
import { useJornada } from '../hooks/useJornada';
import { formatoKm } from '../utils/formato';
import { Permiso, usePermisos } from '../context/PermisosContext';
export default function JornadaScreen({ navigation }) {
  const { puede } = usePermisos();
  const { yo, horario, hoy } = useJornada();
  const { franjas, conEstado, franjasRecordatorio, reportes, ahora, horaVerificada, desfaseMin, cierreHoy, pausas } =
    useFranjasHoy();
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

  // A pie / en vehículo / quieto: total del día y modo actual
  const { modo, dia: desplazamiento, tipoVehiculo } = useDesplazamiento();
  const modoActual = infoModo(modo, tipoVehiculo);
  // Recorrido del día = solo lo que se movió en vehículo (lo caminado no cuenta).
  // Por ahora se asume el vehículo asignado; cuando exista el preoperacional, el trabajador indicará
  // cada día si usa su vehículo propio o uno de la empresa, y solo el propio cuenta para el rodamiento.
  const kmTotal = desplazamiento.totales.vehiculo.km;
  // Vehículo del día: lo indica el preoperacional (propio, de la empresa o ninguno)
  const { dia: registrosDia, vehiculoDelDia, pausaActiva } = useJornadaDia();
  const usoVehiculo = vehiculoDelDia?.uso ?? (api.getPerfil().vehiculo?.propio === false ? 'empresa' : 'propio');

  // Grilla: 2 columnas en celulares, 3 en pantallas anchas (tablet o celular horizontal)
  const { width } = useWindowDimensions();
  const columnas = width >= 560 ? 3 : 2;
  const horarioHoy = api.getHorarioDia(ahora);
  const ancho = Math.floor((width - 40 - 12 * (columnas - 1)) / columnas);

  // Recordatorios cada hora en este celular (se reprograman al enviar un reporte)
  useEffect(() => {
    prepararNotificaciones()
      .then((ok) => {
        // sin permiso de reportes o con el GPS apagado por el supervisor / SST: sin recordatorios
        if (!ok || !puede('reportes.enviar') || registrosDia.gpsApagado) return;
        // Hoy y mañana, para que suene aunque el trabajador no abra la app mañana
        const manana = new Date(ahora);
        manana.setDate(manana.getDate() + 1);
        // Incluye las horas extras activas; al finalizarlas se reprograma sin ellas
        // Durante una pausa no suena ningún recordatorio de reporte, y las ventanas extendidas
        // avisan con su nuevo cierre ("Te quedan 10 minutos" y "No reportaste" a la hora extendida)
        return programarRecordatorios(
          [...franjasRecordatorio, ...franjasDelDia(manana, api.getHorarioDia(manana))],
          reportes,
          tramosDePausas(pausas, ahora),
        );
      })
      .catch(() => {});
  }, [
    franjasRecordatorio.map((f) => `${f.id}:${f.cierre?.getTime() ?? ''}`).join(','),
    reportes.length,
    horaVerificada,
    !!registrosDia.gpsApagado,
    pausas.map((p) => `${p.id}:${p.fin ?? ''}`).join(','),
  ]);

  const abrirReporte = (f) =>
    navigation.navigate('NuevoReporte', {
      franja: {
        id: f.id,
        etiqueta: f.etiqueta,
        inicio: f.inicio.toISOString(),
        fin: f.fin.toISOString(),
        cierre: f.cierre?.toISOString(),
        extensionMin: f.extensionMin ?? 0,
        extensionTexto: textoExtension(f),
        extra: !!f.extra,
        demo: !!f.demo,
      },
    });
  return (
    <SafeAreaView style={s.fondo} edges={[]}>
      <ScrollView contentContainerStyle={s.contenido}>
        <Text style={s.saludo}>Hola, {yo.nombres}</Text>
        <Text style={s.empresa}>{yo.empresa}</Text>

        {/* GPS apagado por un perfil autorizado: la jornada queda cerrada */}
        {registrosDia.gpsApagado && (
          <View style={[s.estado, { backgroundColor: color.rojo }]}>
            <View style={s.estadoFila}>
              <Ionicons name="power" size={30} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={s.estadoTitulo}>Jornada cerrada</Text>
                <Text style={s.estadoSub}>
                  {registrosDia.gpsApagado.por} ({registrosDia.gpsApagado.rol}) apagó tu GPS a las{' '}
                  {new Date(registrosDia.gpsApagado.hora).toLocaleTimeString('es-CO', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
            <Text style={s.estadoNota}>Motivo: {registrosDia.gpsApagado.motivo}</Text>
          </View>
        )}

        {/* Estado del rastreo: automático, sin botones */}
        {!registrosDia.gpsApagado && (
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
            {pausaActiva && <Text style={s.estadoNota}>En pausa: {pausaActiva.texto.toLowerCase()}.</Text>}
          </View>
        )}

        <Permiso clave="horasExtra.usar">
          <TarjetaHorasExtra ahora={ahora} horaVerificada={horaVerificada} />
        </Permiso>

        {/* Incidentes: debajo de horas extras */}
        <Permiso clave="incidentes.reportar">
          <TarjetaIncidentes navigation={navigation} />
        </Permiso>

        {!registrosDia.gpsApagado && (
          <Permiso clave="pausas.usar">
            <TarjetaPausas ahora={ahora} ancho={ancho} />
          </Permiso>
        )}

        {/* Estado de salud de salida: se habilita 30 min antes del fin del horario */}
        {puede('salud.reportar') &&
          horarioHoy &&
          !registrosDia.saludFin &&
          ahora >=
            new Date(enColombia(ahora, horarioHoy.fin).getTime() - REGLAS_JORNADA.saludSalidaAntesMin * 60000) && (
            <Pressable style={s.salida} onPress={() => navigation.navigate('SaludSalida')}>
              <Ionicons name="medkit" size={22} color={color.primario} />
              <View style={{ flex: 1 }}>
                <Text style={s.salidaTitulo}>Reporte de salud de salida</Text>
                <Text style={s.salidaSub}>Antes de terminar tu jornada, cuéntanos cómo te sientes.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.suave} />
            </Pressable>
          )}

        <Permiso clave="reportes.enviar" sino={null}>
          {!registrosDia.gpsApagado && (
            <TarjetaReportes
              franjas={franjas}
              conEstado={conEstado}
              reportes={reportes}
              ahora={ahora}
              horaVerificada={horaVerificada}
              desfaseMin={desfaseMin}
              onEnviar={abrirReporte}
              cierreHoy={cierreHoy}
              pausaActiva={pausaActiva}
            />
          )}
        </Permiso>
        {puede('reportes.verDia') && reportes.length > 0 && (
          <Pressable
            style={s.verReportes}
            onPress={() => navigation.navigate('ReportesDia', { fecha: new Date().toISOString() })}
          >
            <Text style={s.verReportesTexto}>Ver mis reportes de hoy</Text>
            <Ionicons name="chevron-forward" size={16} color={color.primario} />
          </Pressable>
        )}

        {/* Indicadores diarios: todos con el mismo diseño (círculo con ícono, valor, título y detalle).
            Último envío, puntos sin enviar y batería solo los ve el administrador (panel web). */}
        <View style={s.indicadoresCab}>
          <View style={{ flex: 1 }}>
            <Text style={s.indicadoresTitulo}>Indicadores diarios</Text>
            {puede('jornada.indicador.recorrido') && (
              <Text style={s.indicadoresSub}>
                {usoVehiculo === 'ninguno'
                  ? `Hoy sin vehículo · desde las ${hoy.inicio}`
                  : `Recorrido en vehículo ${usoVehiculo === 'propio' ? 'propio' : `de la empresa (${vehiculoDelDia?.placa ?? ''})`} ${formatoKm(kmTotal)} · desde las ${hoy.inicio}`}
              </Text>
            )}
          </View>
          {puede('desplazamiento.ver') && (
            <View style={[s.ahora, { backgroundColor: modoActual.fondo }]}>
              <MaterialCommunityIcons name={modoActual.icono} size={15} color={modoActual.color} />
              <Text style={[s.ahoraTexto, { color: modoActual.color }]}>Ahora: {modoActual.texto.toLowerCase()}</Text>
            </View>
          )}
        </View>
        <View style={s.grilla}>
          <Permiso clave="jornada.indicador.visitas">
            <Dato
              ancho={ancho}
              icono="location"
              valor={visitasHoy.length ? `${cumplidas}/${visitasHoy.length}` : '0'}
              texto="Visitas hoy"
              detalle={visitasHoy.length ? 'Cumplidas / programadas' : 'Sin visitas programadas'}
            />
          </Permiso>
          <Permiso clave="jornada.indicador.eficiencia">
            <Dato
              ancho={ancho}
              icono="checkmark-done"
              tono={nivelEf}
              valor={ef.pct == null ? '—' : `${ef.pct} %`}
              texto="Eficiencia del día"
              detalle={ef.esperados ? `${ef.enviados} de ${ef.esperados} reportes` : 'Aún sin reportes'}
            />
          </Permiso>
          <Permiso clave="jornada.indicador.velocidad">
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
          </Permiso>
          {/* A pie / en vehículo / quieto (se detecta con los pasos del celular y la velocidad del GPS) */}
          {puede('desplazamiento.ver') &&
            ['a_pie', 'vehiculo', 'quieto'].map((k) => {
              const m = infoModo(k, tipoVehiculo);
              const t = desplazamiento.totales[k];
              return (
                <Dato
                  key={k}
                  ancho={ancho}
                  familia="mci"
                  icono={m.icono}
                  tono={{ color: m.color, fondo: m.fondo }}
                  valor={k === 'quieto' ? textoMin(t.seg) : kmTexto(t.km)}
                  texto={m.texto}
                  detalle={k === 'quieto' ? 'Sin moverse' : textoMin(t.seg)}
                />
              );
            })}
        </View>
        {puede('jornada.indicador.velocidad') && resumen.max > 0 && (
          <Text style={s.resumenVel}>
            Hoy: velocidad promedio {resumen.promedio ?? '—'} km/h · máxima {resumen.max} km/h
          </Text>
        )}

        <Permiso clave="visitas.ver">
          <TarjetaVisitas ahora={ahora} navigation={navigation} />
        </Permiso>

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
  salida: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: color.primarioSuave,
    borderRadius: 16,
    padding: 16,
  },
  salidaTitulo: { fontWeight: '800', color: color.texto },
  salidaSub: { color: color.suave, fontSize: 12, marginTop: 2 },
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
  indicadoresCab: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  indicadoresTitulo: { fontSize: 18, fontWeight: '800', color: color.texto },
  indicadoresSub: { color: color.suave, fontSize: 12, marginTop: 2 },
  ahora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ahoraTexto: { fontSize: 12, fontWeight: '700' },
  resumenVel: { color: color.suave, fontSize: 12, textAlign: 'center', marginTop: -4 },
  dato: { flex: 1, backgroundColor: color.tarjeta, borderRadius: 16, padding: 14, gap: 4 },
  datoValor: { fontSize: 20, fontWeight: '800', color: color.texto, marginTop: 4 },
  datoTexto: { color: color.suave, fontSize: 13 },
  aviso: { flexDirection: 'row', gap: 8, backgroundColor: color.ambarSuave, borderRadius: 12, padding: 12 },
  avisoTexto: { flex: 1, color: color.ambar, fontSize: 13, lineHeight: 18 },
});
