import { Fragment, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { color } from '../theme/colors';
import GeocercaEnMapa from '../components/GeocercaEnMapa';
import { useVisitas } from '../context/VisitasContext';
import { useFranjasHoy } from '../hooks/useFranjasHoy';
import { api } from '../services/api';
import { COLOR_MAPA, TIPOS, centroDe, estadoVisita } from '../utils/visitas';

// Todas las visitas de hoy en un mapa, numeradas por la hora programada y con el color de su estado
export default function VisitasMapaScreen({ navigation }) {
  const { visitasHoy, registros } = useVisitas();
  const { ahora } = useFranjasHoy();
  const mapa = useRef(null);
  const fin = api.getHorarioDia(ahora)?.fin;

  const lista = visitasHoy.map((p, i) => ({
    p,
    n: i + 1, // visitasHoy ya viene ordenada por hora
    c: centroDe(p),
    estado: estadoVisita(p, registros[p.id], ahora, fin).estado,
  }));

  const encuadrar = () =>
    mapa.current?.fitToCoordinates(
      lista.map((x) => ({ latitude: x.c.lat, longitude: x.c.lng })),
      { edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: true },
    );

  return (
    <View style={s.fondo}>
      <MapView
        ref={mapa}
        style={s.mapa}
        initialRegion={{
          latitude: lista[0]?.c.lat ?? 6.2476,
          longitude: lista[0]?.c.lng ?? -75.573,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        showsUserLocation
        onMapReady={encuadrar}
        toolbarEnabled={false}
      >
        {lista.map(({ p, n, c, estado }) => {
          const col = COLOR_MAPA[estado];
          return (
            <Fragment key={p.id}>
              <GeocercaEnMapa p={p} />
              <Marker coordinate={{ latitude: c.lat, longitude: c.lng }}>
                <View style={[s.pin, { backgroundColor: col.color }]}>
                  <Text style={[s.pinTexto, { color: col.texto }]}>{n}</Text>
                </View>
                <Callout onPress={() => navigation.navigate('VisitaDetalle', { id: p.id })}>
                  <View style={s.globo}>
                    <Text style={s.globoTitulo}>
                      {n}. {p.titulo}
                    </Text>
                    <Text style={s.globoTexto}>
                      {TIPOS[p.tipo].texto} · programada {p.hora}
                    </Text>
                    <Text style={[s.globoEstado, { color: col.color === color.amarillo ? color.ambar : col.color }]}>
                      {col.nombre}
                    </Text>
                    <Text style={s.globoVer}>Toca para ver el detalle</Text>
                  </View>
                </Callout>
              </Marker>
            </Fragment>
          );
        })}
      </MapView>

      {/* Leyenda de colores */}
      <View style={s.leyenda}>
        {['pendiente', 'cumplida', 'no_cumplida'].map((k) => (
          <View key={k} style={s.item}>
            <View style={[s.punto, { backgroundColor: COLOR_MAPA[k].color }]} />
            <Text style={s.itemTexto}>{COLOR_MAPA[k].nombre}</Text>
          </View>
        ))}
        <Text style={s.itemTexto}>· {lista.length} visitas</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  mapa: { flex: 1 },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 3,
  },
  pinTexto: { fontWeight: '800', fontSize: 14 },
  globo: { width: 210, gap: 2, padding: 4 },
  globoTitulo: { fontWeight: '800', color: color.texto },
  globoTexto: { color: color.suave, fontSize: 12 },
  globoEstado: { fontWeight: '700', fontSize: 12 },
  globoVer: { color: color.primario, fontSize: 11, marginTop: 4 },
  leyenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: color.tarjeta,
    padding: 14,
    paddingBottom: 24,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 12, height: 12, borderRadius: 6 },
  itemTexto: { color: color.texto, fontSize: 13, fontWeight: '600' },
});
