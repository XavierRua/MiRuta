import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { formatoKm } from '../utils/formato';
import { formatoDiaCorto } from '../utils/fechas';
import { nivelEficiencia, porcentaje } from '../utils/eficiencia';
import { hhmm } from '../utils/reportes';
import { INDICADORES } from '../config/indicadores';

// Filtros del historial (horas extras, kilometraje, eficiencia y excesos) para el período elegido.
// Solo lee las jornadas que ya calcula la pantalla Historial: no cambia cómo se obtienen.
export const FILTROS = [
  { id: 'resumen', texto: 'Resumen', icono: 'list' },
  { id: 'horasExtra', texto: 'Horas extras', icono: 'moon' },
  { id: 'km', texto: 'Kilometraje', icono: 'map' },
  { id: 'eficiencia', texto: 'Eficiencia', icono: 'checkmark-done' },
  { id: 'excesos', texto: 'Excesos de velocidad', icono: 'warning' },
];

const coma = (n) => String(n).replace('.', ',');
const abrirMapa = (lat, lng) =>
  Linking.openURL(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`);

export default function FiltroHistorial({ tipo, jornadas }) {
  if (tipo === 'horasExtra') return <HorasExtra jornadas={jornadas} />;
  if (tipo === 'km') return <Kilometraje jornadas={jornadas} />;
  if (tipo === 'eficiencia') return <Eficiencia jornadas={jornadas} />;
  if (tipo === 'excesos') return <Excesos jornadas={jornadas} />;
  return null;
}

// ---------- Horas extras ----------
function HorasExtra({ jornadas }) {
  const dias = jornadas.filter((j) => j.horasExtra);
  const total = Math.round(dias.reduce((t, j) => t + (j.horasExtra.horas ?? 0), 0) * 10) / 10;
  return (
    <>
      <Total
        fondo={color.morado}
        valor={`${coma(total)} h`}
        texto={`Horas extras del período · ${dias.length} ${dias.length === 1 ? 'día' : 'días'}`}
      />
      <Detalle vacio="Sin horas extras en este período." n={dias.length}>
        {dias.map((j) => {
          const h = j.horasExtra;
          const lugar = typeof h.lugar === 'object' && h.lugar ? h.lugar : null;
          return (
            <View key={j.fecha.toISOString()} style={s.fila}>
              <View style={{ flex: 1 }}>
                <Text style={s.fecha}>{formatoDiaCorto(j.fecha)}</Text>
                <Text style={s.sub}>
                  {h.inicio} – {h.fin} ·{' '}
                  {lugar ? (
                    <Text style={s.enlace} onPress={() => abrirMapa(lugar.lat, lugar.lng)}>
                      {lugar.lat.toFixed(4)}, {lugar.lng.toFixed(4)}
                    </Text>
                  ) : (
                    (h.lugar ?? 'Lugar sin registrar')
                  )}
                </Text>
              </View>
              <Text style={[s.valor, { color: color.morado }]}>{coma(h.horas)} h</Text>
            </View>
          );
        })}
      </Detalle>
    </>
  );
}

// ---------- Kilometraje ----------
function Kilometraje({ jornadas }) {
  const kmDia = (j) => j.km + (j.horasExtra?.km ?? 0);
  const total = jornadas.reduce((t, j) => t + kmDia(j), 0);
  return (
    <>
      <Total
        fondo={color.oscuro}
        valor={formatoKm(total)}
        texto={`Recorridos en el período · promedio ${formatoKm(jornadas.length ? total / jornadas.length : 0)} por día`}
      />
      <Detalle vacio="No hay jornadas en estas fechas." n={jornadas.length}>
        {jornadas.map((j) => (
          <View key={j.fecha.toISOString()} style={s.fila}>
            <View style={{ flex: 1 }}>
              <Text style={s.fecha}>{formatoDiaCorto(j.fecha)}</Text>
              <Text style={s.sub}>
                Jornada {formatoKm(j.km)}
                {j.horasExtra ? ` · horas extras ${formatoKm(j.horasExtra.km ?? 0)}` : ''}
              </Text>
            </View>
            <Text style={s.valor}>{formatoKm(kmDia(j))}</Text>
          </View>
        ))}
      </Detalle>
    </>
  );
}

// ---------- Eficiencia ----------
function Eficiencia({ jornadas }) {
  const conReportes = jornadas.filter((j) => j.reportesEsperados > 0);
  const pcts = conReportes.map((j) => porcentaje(j.reportesEnviados, j.reportesEsperados));
  const promedio = pcts.length ? Math.round(pcts.reduce((t, p) => t + p, 0) / pcts.length) : null;
  const n = nivelEficiencia(promedio);
  return (
    <>
      <Total
        fondo={n.color ?? color.oscuro}
        valor={promedio == null ? '—' : `${promedio} %`}
        texto={`Eficiencia promedio del período · ${pcts.length} ${pcts.length === 1 ? 'día' : 'días'}`}
      />
      <View style={s.leyenda}>
        {[
          [`≥ ${INDICADORES.eficienciaVerde} %`, color.verde],
          [`${INDICADORES.eficienciaNaranja}–${INDICADORES.eficienciaVerde - 1} %`, color.naranja],
          [`< ${INDICADORES.eficienciaNaranja} %`, color.rojo],
        ].map(([t, c]) => (
          <View key={t} style={s.leyendaItem}>
            <View style={[s.punto, { backgroundColor: c }]} />
            <Text style={s.sub}>{t}</Text>
          </View>
        ))}
      </View>
      <Detalle vacio="No hay reportes en estas fechas." n={conReportes.length}>
        {conReportes.map((j) => {
          const pct = porcentaje(j.reportesEnviados, j.reportesEsperados);
          const nv = nivelEficiencia(pct);
          return (
            <View key={j.fecha.toISOString()} style={s.fila}>
              <View style={{ flex: 1 }}>
                <Text style={s.fecha}>{formatoDiaCorto(j.fecha)}</Text>
                <Text style={s.sub}>
                  {j.reportesEnviados} de {j.reportesEsperados} reportes a tiempo
                </Text>
              </View>
              <Text style={[s.chip, { color: nv.color, backgroundColor: nv.fondo }]}>{pct} %</Text>
            </View>
          );
        })}
      </Detalle>
    </>
  );
}

// ---------- Excesos de velocidad ----------
function Excesos({ jornadas }) {
  const lista = jornadas.flatMap((j) => j.excesos.map((e) => ({ ...e, dia: j.fecha })));
  return (
    <>
      <Total
        fondo={lista.length ? color.rojo : color.verde}
        valor={`${lista.length}`}
        texto={`Excesos de velocidad en el período${lista.length ? '' : ' · ¡sin excesos!'}`}
      />
      <Detalle vacio="Sin excesos de velocidad en este período." n={lista.length}>
        {lista.map((e) => (
          <Pressable key={e.id} style={s.fila} onPress={() => abrirMapa(e.lat, e.lng)}>
            <View style={{ flex: 1 }}>
              <Text style={s.fecha}>
                {formatoDiaCorto(e.dia)} · {hhmm(new Date(e.fecha))}
              </Text>
              <Text style={s.sub}>
                <Ionicons name="location" size={12} color={color.suave} /> {Number(e.lat).toFixed(5)},{' '}
                {Number(e.lng).toFixed(5)} · límite {e.limite} km/h
              </Text>
            </View>
            <Text style={[s.chip, { color: color.rojo, backgroundColor: color.rojoSuave }]}>{e.velocidad} km/h</Text>
          </Pressable>
        ))}
      </Detalle>
      {lista.length > 0 && <Text style={s.nota}>Toca un exceso para ver la ubicación en el mapa.</Text>}
    </>
  );
}

// ---------- Piezas comunes ----------
function Total({ fondo, valor, texto }) {
  return (
    <View style={[s.total, { backgroundColor: fondo }]}>
      <Text style={s.totalValor}>{valor}</Text>
      <Text style={s.totalTexto}>{texto}</Text>
    </View>
  );
}

function Detalle({ n, vacio, children }) {
  return (
    <View style={s.tarjeta}>
      <Text style={s.titulo}>Detalle por día</Text>
      {n === 0 ? <Text style={s.sub}>{vacio}</Text> : children}
    </View>
  );
}

const s = StyleSheet.create({
  total: { borderRadius: 18, padding: 18 },
  totalValor: { color: '#fff', fontSize: 32, fontWeight: '800' },
  totalTexto: { color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: 16, padding: 16, gap: 4 },
  titulo: { fontWeight: '700', fontSize: 16, color: color.texto, marginBottom: 6 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: color.fondo,
  },
  fecha: { fontWeight: '700', color: color.texto },
  sub: { color: color.suave, fontSize: 12, marginTop: 2 },
  enlace: { color: color.primario, textDecorationLine: 'underline' },
  valor: { fontWeight: '800', color: color.texto, fontSize: 15 },
  chip: {
    fontWeight: '800',
    fontSize: 13,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  leyenda: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  nota: { color: color.suave, fontSize: 12, textAlign: 'center' },
});
