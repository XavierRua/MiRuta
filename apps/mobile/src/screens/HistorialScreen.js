import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CampoFecha from '../components/CampoFecha';
import { color } from '../theme/colors';
import { api } from '../services/api';
import { formatoKm } from '../utils/formato';
import { eficienciaHoy, nivelEficiencia, porcentaje } from '../utils/eficiencia';
import { nivelVelocidad } from '../utils/velocidad';
import { useFranjasHoy } from '../hooks/useFranjasHoy';
import { useExcesos } from '../context/ExcesosContext';
import { useHorasExtra } from '../context/HorasExtraContext';
import { useVisitas } from '../context/VisitasContext';
import { ESTADOS, TIPOS, estadoVisita, horaCorta, textoPermanencia, visitasDeDiaAnterior } from '../utils/visitas';
import { duracionMs } from '../utils/horasExtra';
import { ahoraServidor } from '../services/horaServidor';
import { hhmm } from '../utils/reportes';
import { mismoDia } from '../utils/fechas';
import { formatoDiaCorto, hoy, rangoDia, rangoMes, rangoSemana, validarRango } from '../utils/fechas';
import FiltroHistorial, { FILTROS } from '../components/FiltroHistorial';
import { usePermisos } from '../context/PermisosContext';
import { useDesplazamiento } from '../context/DesplazamientoContext';
import { useJornadaDia } from '../context/JornadaDiaContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { infoModo, kmTexto, textoMin } from '../utils/desplazamiento';

// Cómo se muestra cada tipo de lugar (geocerca)
const tipoLugar = {
  Zona: { icono: 'map', fondo: color.azulSuave, texto: color.azul },
  Cliente: { icono: 'storefront', fondo: color.verdeSuave, texto: color.verde },
  Obra: { icono: 'construct', fondo: color.ambarSuave, texto: color.ambar },
};

const atajos = { Día: rangoDia, Semana: rangoSemana, Mes: rangoMes };

export default function HistorialScreen({ navigation }) {
  const { puede } = usePermisos();
  const { dia: desplazamientoHoy, tipoVehiculo } = useDesplazamiento();
  const { dia: registrosHoy } = useJornadaDia();
  const pausasHoy = registrosHoy.pausas
    .filter((p) => p.fin)
    .map((p) => ({ texto: p.texto, inicio: hhmm(new Date(p.inicio)), fin: hhmm(new Date(p.fin)) }));
  const inicial = rangoSemana();
  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [atajo, setAtajo] = useState('Semana'); // null cuando el usuario elige fechas a mano
  const [filtro, setFiltro] = useState('resumen'); // resumen (lo de siempre) u otro filtro del período

  const error = validarRango(desde, hasta);
  const { conEstado } = useFranjasHoy(); // jornada normal + horas extras
  const hoyEf = eficienciaHoy(conEstado);
  const { excesos: excesosHoy } = useExcesos();
  const { sesiones } = useHorasExtra();
  const { visitasHoy, registros } = useVisitas();

  // Visitas programadas de hoy con lo que registró el GPS de este celular
  const visitasDeHoy = (() => {
    const ahora = ahoraServidor();
    const fin = api.getHorarioDia(ahora)?.fin;
    return visitasHoy.map((p) => ({ programacion: p, ...estadoVisita(p, registros[p.id], ahora, fin) }));
  })();
  const firmaVisitas = visitasDeHoy.map((v) => v.estado + v.llegada + v.salida).join('|');

  // Horas extras de hoy (de este celular): suma de las sesiones y sus reportes
  const extraHoy = (() => {
    if (!sesiones.length) return null;
    const ahora = ahoraServidor();
    const fx = conEstado.filter((f) => f.extra && f.estado !== 'proximo' && f.estado !== 'disponible');
    const ultima = sesiones[sesiones.length - 1];
    return {
      inicio: hhmm(new Date(sesiones[0].inicio)),
      fin: ultima.fin ? hhmm(new Date(ultima.fin)) : 'en curso',
      lugar: sesiones[0].lugar ?? null, // ubicación donde inició las horas extras
      horas: Math.round(sesiones.reduce((t, x) => t + duracionMs(x, ahora), 0) / 360000) / 10,
      km: Math.round(sesiones.reduce((t, x) => t + (x.km ?? 0), 0) * 10) / 10,
      reportesEsperados: fx.length,
      reportesEnviados: fx.filter((f) => f.estado === 'enviado').length,
    };
  })();

  // La jornada de hoy usa los reportes reales de este celular; las anteriores, los guardados
  const jornadas = useMemo(
    () =>
      error
        ? []
        : api.getJornadas(desde, hasta).map((j) =>
            mismoDia(j.fecha, new Date())
              ? {
                  ...j,
                  reportesEnviados: hoyEf.enviados,
                  reportesEsperados: hoyEf.esperados,
                  excesos: excesosHoy,
                  horasExtra: extraHoy ?? j.horasExtra,
                  visitas: visitasDeHoy,
                  desplazamiento: desplazamientoHoy.totales,
                  pausas: pausasHoy,
                }
              : {
                  ...j,
                  visitas: visitasDeDiaAnterior(api.getProgramaciones(), j.fecha, api.getHorarioDia(j.fecha)?.fin),
                },
          ),
    [
      desde,
      hasta,
      error,
      hoyEf.enviados,
      hoyEf.esperados,
      excesosHoy,
      extraHoy?.horas,
      extraHoy?.fin,
      firmaVisitas,
      desplazamientoHoy,
      pausasHoy.length,
    ],
  );
  const enviadosPeriodo = jornadas.reduce((s, j) => s + j.reportesEnviados, 0);
  const esperadosPeriodo = jornadas.reduce((s, j) => s + j.reportesEsperados, 0);
  const efPeriodo = porcentaje(enviadosPeriodo, esperadosPeriodo);

  const total = jornadas.reduce((s, j) => s + j.km, 0);
  const visitasPeriodo = jornadas.flatMap((j) => j.visitas);
  const cumplidasPeriodo = visitasPeriodo.filter((v) => v.estado === 'cumplida').length;
  const cerradasPeriodo = visitasPeriodo.filter((v) => ['cumplida', 'no_cumplida'].includes(v.estado)).length;
  const alertasPeriodo = visitasPeriodo.reduce((t, v) => t + (v.alertasSalida?.length ?? 0), 0);
  const horasExtraPeriodo = Math.round(jornadas.reduce((s, j) => s + (j.horasExtra?.horas ?? 0), 0) * 10) / 10;

  // Lugares visitados en el período, con cuántas veces se visitó cada uno
  const lugares = useMemo(() => {
    const conteo = new Map();
    jornadas.forEach((j) =>
      j.lugares.forEach((l) => conteo.set(l.nombre, { ...l, veces: (conteo.get(l.nombre)?.veces ?? 0) + 1 })),
    );
    return [...conteo.values()].sort((a, b) => b.veces - a.veces);
  }, [jornadas]);

  const elegirAtajo = (nombre) => {
    const r = atajos[nombre]();
    setDesde(r.desde);
    setHasta(r.hasta);
    setAtajo(nombre);
  };

  return (
    <SafeAreaView style={s.fondo} edges={[]}>
      <ScrollView contentContainerStyle={s.contenido}>
        <Text style={s.titulo}>Mi historial</Text>

        {/* Atajos: llenan Desde y Hasta automáticamente */}
        <View style={s.segmentos}>
          {[...Object.keys(atajos), 'Rango'].map((p) => {
            const activo = p === 'Rango' ? atajo === null : atajo === p;
            return (
              <Pressable
                key={p}
                style={[s.seg, activo && s.segActivo]}
                onPress={() => (p === 'Rango' ? setAtajo(null) : elegirAtajo(p))}
              >
                <Text style={[s.segTexto, activo && s.segTextoActivo]}>
                  {p /* Día · Semana (últimos 7 días) · Mes (este mes) · Rango (Desde – Hasta) */}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Selector Desde – Hasta */}
        <View style={s.fechas}>
          <CampoFecha
            etiqueta="Desde"
            valor={desde}
            maxima={hoy()}
            error={!!error}
            onCambiar={(f) => {
              setDesde(f);
              setAtajo(null);
            }}
          />
          <Ionicons name="arrow-forward" size={18} color={color.suave} style={s.flecha} />
          <CampoFecha
            etiqueta="Hasta"
            valor={hasta}
            minima={desde}
            maxima={hoy()}
            error={!!error}
            onCambiar={(f) => {
              setHasta(f);
              setAtajo(null);
            }}
          />
        </View>

        {/* Filtros del período: Resumen es lo de siempre; los demás muestran el total y el detalle por día */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtros}>
          {FILTROS.filter((f) => !f.permiso || puede(f.permiso)).map((f) => (
            <Pressable key={f.id} style={[s.filtro, filtro === f.id && s.filtroActivo]} onPress={() => setFiltro(f.id)}>
              <Ionicons name={f.icono} size={14} color={filtro === f.id ? '#fff' : color.suave} />
              <Text style={[s.filtroTexto, filtro === f.id && s.filtroTextoActivo]}>{f.texto}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {error ? (
          <View style={s.error}>
            <Ionicons name="alert-circle" size={18} color={color.rojo} />
            <Text style={s.errorTexto}>{error}</Text>
          </View>
        ) : filtro !== 'resumen' ? (
          <FiltroHistorial tipo={filtro} jornadas={jornadas} />
        ) : (
          <>
            <View style={s.resumen}>
              <Text style={s.resumenValor}>{formatoKm(total)}</Text>
              <Text style={s.resumenTexto}>
                {jornadas.length} {jornadas.length === 1 ? 'jornada' : 'jornadas'}
                {jornadas.length > 0 && ` · promedio ${formatoKm(total / jornadas.length)} por día`}
              </Text>
              {horasExtraPeriodo > 0 && (
                <Text style={s.resumenExtra}>Horas extras: {String(horasExtraPeriodo).replace('.', ',')} h</Text>
              )}
              <View style={s.efPeriodo}>
                <Text style={s.efPeriodoTexto}>Eficiencia de reportes del periodo</Text>
                <Text
                  style={[
                    s.efPeriodoValor,
                    { color: nivelEficiencia(efPeriodo).color, backgroundColor: nivelEficiencia(efPeriodo).fondo },
                  ]}
                >
                  {efPeriodo == null ? '—' : `${efPeriodo} %`}
                </Text>
              </View>
              {visitasPeriodo.length > 0 && (
                <View style={s.efPeriodo}>
                  <Text style={s.efPeriodoTexto}>
                    Visitas cumplidas: {cumplidasPeriodo} de {visitasPeriodo.length}
                    {alertasPeriodo > 0 &&
                      ` · ${alertasPeriodo} ${alertasPeriodo === 1 ? 'salida' : 'salidas'} del área`}
                  </Text>
                  <ChipEf pct={porcentaje(cumplidasPeriodo, cerradasPeriodo)} />
                </View>
              )}
            </View>

            {lugares.length > 0 && (
              <View style={s.tarjeta}>
                <Text style={s.tarjetaTitulo}>Lugares visitados</Text>
                {lugares.map((l) => (
                  <View key={l.nombre} style={s.lugarFila}>
                    <Etiqueta lugar={l} />
                    <Text style={s.veces}>
                      {l.veces} {l.veces === 1 ? 'día' : 'días'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {jornadas.length === 0 && (
              <View style={s.vacio}>
                <Ionicons name="calendar-clear-outline" size={32} color={color.suave} />
                <Text style={s.vacioTexto}>No hay jornadas en estas fechas.</Text>
              </View>
            )}

            {jornadas.map((j) => (
              <View key={j.fecha.toISOString()} style={s.jornada}>
                <View style={s.jornadaCab}>
                  <View style={s.jornadaIcono}>
                    <Ionicons name="bicycle" size={22} color={color.primario} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fecha}>{formatoDiaCorto(j.fecha)}</Text>
                    <Text style={s.detalle}>
                      {j.inicio} – {j.fin}
                    </Text>
                  </View>
                  <Text style={s.km}>{formatoKm(j.km)}</Text>
                </View>
                <View style={s.etiquetas}>
                  {j.lugares.map((l) => (
                    <Etiqueta key={l.nombre} lugar={l} />
                  ))}
                </View>
                {/* Desplazamiento del día: a pie y en vehículo */}
                {puede('desplazamiento.ver') && j.desplazamiento && (
                  <View style={s.desplazamiento}>
                    {['a_pie', 'vehiculo'].map((k) => {
                      const m = infoModo(k, tipoVehiculo);
                      return (
                        <View key={k} style={s.despItem}>
                          <MaterialCommunityIcons name={m.icono} size={16} color={m.color} />
                          <Text style={s.velTexto}>
                            {m.texto}{' '}
                            <Text style={s.velValor}>
                              {kmTexto(j.desplazamiento[k].km)} · {textoMin(j.desplazamiento[k].seg)}
                            </Text>
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                {/* Pausas y descansos del día */}
                {puede('pausas.usar') && j.pausas?.length > 0 && (
                  <Text style={s.velTexto}>
                    <Ionicons name="pause-circle" size={13} color={color.morado} />{' '}
                    {j.pausas.map((p) => `${p.texto} ${p.inicio}–${p.fin}`).join(' · ')}
                  </Text>
                )}
                {/* Velocidades guardadas al cerrar la jornada */}
                <View style={s.velocidades}>
                  <Text style={s.velTexto}>
                    Vel. promedio <Text style={s.velValor}>{j.velPromedio} km/h</Text>
                  </Text>
                  <Text style={s.velTexto}>
                    Máxima <Text style={[s.velValor, { color: nivelVelocidad(j.velMax).color }]}>{j.velMax} km/h</Text>
                  </Text>
                </View>
                {/* Visitas programadas por el administrador y su cumplimiento */}
                {puede('historial.visitas') && j.visitas.length > 0 && (
                  <View style={s.visitas}>
                    <Text style={s.visitasTitulo}>
                      <Ionicons name="flag" size={13} color={color.azul} /> Visitas programadas (
                      {j.visitas.filter((v) => v.estado === 'cumplida').length} de {j.visitas.length} cumplidas)
                    </Text>
                    {j.visitas.map((v) => {
                      const t = TIPOS[v.programacion.tipo];
                      const e = ESTADOS[v.estado];
                      return (
                        <View key={v.programacion.id} style={s.visita}>
                          <Ionicons name={t.icono} size={15} color={t.color} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.visitaNombre} numberOfLines={1}>
                              {v.programacion.titulo}
                            </Text>
                            <Text style={s.visitaTexto}>
                              Est. {v.programacion.hora}
                              {v.periodos.length === 0 && v.llegada ? ` · llegó ${horaCorta(v.llegada)}` : ''}
                              {v.periodos.length === 0 && v.salida ? ` · salió ${horaCorta(v.salida)}` : ''}
                              {v.permanenciaMin != null
                                ? ` · ${v.periodos.length ? 'dentro ' : ''}${textoPermanencia(v.permanenciaMin)}`
                                : ''}
                              {v.puntosTotal ? ` · ${v.puntosVisitados}/${v.puntosTotal} puntos` : ''}
                            </Text>
                            {/* Cada entrada y salida de la geocerca */}
                            {v.periodos.length > 0 && (
                              <Text style={s.visitaTexto}>
                                {v.periodos
                                  .map((x) => `${horaCorta(x.entrada)}–${x.salida ? horaCorta(x.salida) : 'dentro'}`)
                                  .join('  ·  ')}
                              </Text>
                            )}
                            {puede('desplazamiento.ver') && v.tiempos && (
                              <Text style={s.visitaTexto}>
                                Dentro: a pie {textoMin(v.tiempos.a_pie)} · en vehículo {textoMin(v.tiempos.vehiculo)}
                                {v.periodos.some((x) => x.modoSalida === 'a_pie') ? ' · salió a pie' : ''}
                              </Text>
                            )}
                            {v.alertasSalida.map((a, k) => (
                              <Text key={k} style={s.visitaAlerta}>
                                <Ionicons name="warning" size={11} color={color.rojo} /> Salió del área asignada a las{' '}
                                {horaCorta(a.hora)}
                              </Text>
                            ))}
                          </View>
                          <Text style={[s.visitaEstado, { color: e.color, backgroundColor: e.fondo }]}>{e.texto}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                {/* Horas extras: se muestran aparte, en morado */}
                {j.horasExtra && (
                  <View style={s.extra}>
                    <View style={s.extraCab}>
                      <Text style={s.extraTitulo}>
                        <Ionicons name="moon" size={13} color={color.morado} /> Horas extras
                      </Text>
                      <Text style={s.extraHoras}>{String(j.horasExtra.horas).replace('.', ',')} h</Text>
                    </View>
                    <Text style={s.extraTexto}>
                      {j.horasExtra.inicio} – {j.horasExtra.fin} · {formatoKm(j.horasExtra.km)} · reportes{' '}
                      {j.horasExtra.reportesEnviados} de {j.horasExtra.reportesEsperados}
                    </Text>
                  </View>
                )}
                {/* Excesos de velocidad registrados ese día */}
                {j.excesos.length > 0 && (
                  <View style={s.excesos}>
                    <Text style={s.excesosTitulo}>
                      <Ionicons name="warning" size={13} color={color.rojo} /> Excesos de velocidad ({j.excesos.length})
                    </Text>
                    {j.excesos.map((e) => (
                      <Pressable
                        key={e.id}
                        style={s.exceso}
                        onPress={() =>
                          Linking.openURL(
                            `https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lng}#map=17/${e.lat}/${e.lng}`,
                          )
                        }
                      >
                        <Text style={s.excesoVel}>{e.velocidad} km/h</Text>
                        <Text style={s.excesoTexto}>
                          {hhmm(e.fecha)} · límite {e.limite} km/h
                        </Text>
                        <Text style={s.excesoMapa}>Ver ubicación</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {puede('historial.reportes') && (
                  <Pressable
                    style={s.reportes}
                    onPress={() => navigation.navigate('ReportesDia', { fecha: j.fecha.toISOString() })}
                  >
                    <Ionicons name="document-text-outline" size={16} color={color.primario} />
                    <Text style={s.reportesTexto}>
                      Reportes: {j.reportesEnviados} de {j.reportesEsperados}
                      {j.reportesEsperados - j.reportesEnviados > 0 &&
                        ` · ${j.reportesEsperados - j.reportesEnviados} no reportó`}
                    </Text>
                    <ChipEf pct={porcentaje(j.reportesEnviados, j.reportesEsperados)} />
                    <Ionicons name="chevron-forward" size={16} color={color.suave} />
                  </Pressable>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Porcentaje de eficiencia con su color
function ChipEf({ pct }) {
  const n = nivelEficiencia(pct);
  return <Text style={[s.chipEf, { color: n.color, backgroundColor: n.fondo }]}>{pct == null ? '—' : `${pct} %`}</Text>;
}

// Etiqueta de color con el tipo de lugar: Zona, Cliente u Obra
function Etiqueta({ lugar }) {
  const t = tipoLugar[lugar.tipo] ?? tipoLugar.Zona;
  return (
    <View style={[s.etiqueta, { backgroundColor: t.fondo }]}>
      <Ionicons name={t.icono} size={12} color={t.texto} />
      <Text style={[s.etiquetaTexto, { color: t.texto }]}>{lugar.nombre}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  desplazamiento: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  despItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  filtros: { gap: 8, paddingVertical: 2 },
  filtro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e9edf3',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filtroActivo: { backgroundColor: color.primario },
  filtroTexto: { color: color.suave, fontWeight: '600', fontSize: 13 },
  filtroTextoActivo: { color: '#fff' },
  visitas: { backgroundColor: color.azulSuave, borderRadius: 12, padding: 10, gap: 8 },
  visitasTitulo: { color: color.azul, fontWeight: '700', fontSize: 13 },
  visita: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  visitaNombre: { color: color.texto, fontWeight: '600', fontSize: 13 },
  visitaTexto: { color: color.suave, fontSize: 12 },
  visitaAlerta: { color: color.rojo, fontSize: 12, fontWeight: '600' },
  visitaEstado: {
    fontSize: 11,
    fontWeight: '700',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 20, gap: 12, paddingBottom: 32 },
  titulo: { fontSize: 26, fontWeight: '800', color: color.texto, marginBottom: 2 },
  segmentos: { flexDirection: 'row', backgroundColor: '#e9edf3', borderRadius: 12, padding: 4 },
  seg: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segActivo: { backgroundColor: '#fff' },
  segTexto: { color: color.suave, fontWeight: '600', fontSize: 13 },
  segTextoActivo: { color: color.texto },
  fechas: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  flecha: { marginBottom: 14 },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: color.rojoSuave,
    borderRadius: 12,
    padding: 12,
  },
  errorTexto: { flex: 1, color: color.rojo, fontWeight: '600' },
  resumen: { backgroundColor: color.oscuro, borderRadius: 18, padding: 18 },
  resumenValor: { color: '#fff', fontSize: 32, fontWeight: '800' },
  resumenTexto: { color: '#cbd5e1', marginTop: 4 },
  resumenExtra: { color: '#c4b5fd', fontWeight: '700', marginTop: 4 },
  efPeriodo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  efPeriodoTexto: { color: '#e2e8f0', fontWeight: '600' },
  efPeriodoValor: {
    fontWeight: '800',
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  chipEf: {
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: 16, padding: 16, gap: 10 },
  tarjetaTitulo: { fontWeight: '700', fontSize: 16, color: color.texto },
  lugarFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  veces: { color: color.suave, fontSize: 13 },
  vacio: { alignItems: 'center', gap: 8, padding: 24 },
  vacioTexto: { color: color.suave },
  jornada: { backgroundColor: color.tarjeta, borderRadius: 14, padding: 14, gap: 10 },
  jornadaCab: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  jornadaIcono: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: color.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fecha: { fontWeight: '700', color: color.texto },
  detalle: { color: color.suave, marginTop: 2, fontSize: 13 },
  km: { fontWeight: '800', fontSize: 16, color: color.texto },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  velocidades: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  velTexto: { color: color.suave, fontSize: 13 },
  velValor: { color: color.texto, fontWeight: '700' },
  extra: { backgroundColor: color.moradoSuave, borderRadius: 10, padding: 10, gap: 4 },
  extraCab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  extraTitulo: { color: color.morado, fontWeight: '700', fontSize: 13 },
  extraHoras: { color: color.morado, fontWeight: '800' },
  extraTexto: { color: color.texto, fontSize: 12 },
  excesos: { backgroundColor: color.rojoSuave, borderRadius: 10, padding: 10, gap: 6 },
  excesosTitulo: { color: color.rojo, fontWeight: '700', fontSize: 13 },
  exceso: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  excesoVel: { color: color.rojo, fontWeight: '800', fontSize: 13, minWidth: 64 },
  excesoTexto: { flex: 1, color: color.texto, fontSize: 12 },
  excesoMapa: { color: color.primario, fontSize: 12, fontWeight: '600' },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  etiquetaTexto: { fontSize: 12, fontWeight: '600' },
  reportes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: color.borde,
    paddingTop: 10,
  },
  reportesTexto: { flex: 1, color: color.primario, fontWeight: '600', fontSize: 13 },
});
