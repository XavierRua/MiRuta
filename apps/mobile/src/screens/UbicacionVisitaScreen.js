import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import ComoLlegar from '../components/ComoLlegar';
import GeocercaEnMapa from '../components/GeocercaEnMapa';
import { useVisitas } from '../context/VisitasContext';
import { useMiUbicacion } from '../hooks/useMiUbicacion';
import { TIPOS, centroDe, destinoDe, distanciaAlLugar, formatoDistancia } from '../utils/visitas';

// Ubicación de la visita: el punto y la geocerca que definió el administrador, dónde estoy y a qué distancia
export default function UbicacionVisitaScreen({ route }) {
  const { visitasHoy, registros } = useVisitas();
  const { pos, error } = useMiUbicacion();
  const mapa = useRef(null);
  const p = visitasHoy.find((x) => x.id === route.params.id);
  if (!p)
    return (
      <View style={[s.fondo, s.centro]}>
        <Text style={s.suave}>Esta visita ya no está programada para hoy.</Text>
      </View>
    );

  const r = registros[p.id];
  const destino = destinoDe(p, r);
  const distancia = distanciaAlLugar(p, pos, r);
  const t = TIPOS[p.tipo];
  const c = centroDe(p);
  const puntos =
    p.tipo === 'zona'
      ? p.area.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
      : p.puntos.map((x) => ({ latitude: x.lat, longitude: x.lng }));

  // Encuadra el lugar y, si ya hay GPS, también al trabajador
  const encuadrar = () =>
    mapa.current?.fitToCoordinates(pos ? [...puntos, { latitude: pos.lat, longitude: pos.lng }] : puntos, {
      edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
      animated: true,
    });

  return (
    <View style={s.fondo}>
      <MapView
        ref={mapa}
        style={s.mapa}
        initialRegion={{ latitude: c.lat, longitude: c.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        showsUserLocation
        showsMyLocationButton
        onMapReady={encuadrar}
        toolbarEnabled={false}
      >
        <GeocercaEnMapa p={p} conPines />
      </MapView>

      <View style={s.panel}>
        <View style={s.fila}>
          <View style={[s.icono, { backgroundColor: t.fondo }]}>
            <Ionicons name={t.icono} size={20} color={t.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.titulo} numberOfLines={1}>
              {p.tipo === 'ruta' ? `Siguiente: ${destino.nombre}` : destino.nombre}
            </Text>
            <Text style={s.suave} numberOfLines={2}>
              {destino.direccion || (p.tipo === 'zona' ? 'Área marcada por el administrador' : '')}
            </Text>
          </View>
        </View>

        <View style={[s.distancia, distancia === 0 && { backgroundColor: color.verdeSuave }]}>
          <Ionicons
            name={distancia === 0 ? 'checkmark-circle' : 'walk'}
            size={18}
            color={distancia === 0 ? color.verde : color.azul}
          />
          <Text style={[s.distanciaTexto, distancia === 0 && { color: color.verde }]}>
            {error
              ? error
              : !pos
                ? 'Buscando tu ubicación…'
                : distancia === 0
                  ? 'Estás dentro del área de la visita'
                  : `Estás a ${formatoDistancia(distancia)} del lugar`}
          </Text>
        </View>

        <View style={s.fila}>
          <ComoLlegar destino={destino} />
        </View>
        <Text style={s.nota}>
          {p.tipo === 'obra'
            ? `El círculo es la geocerca (${p.radio} m). `
            : p.tipo === 'zona'
              ? 'El área morada es la zona asignada. '
              : `Cada círculo azul es un punto de la ruta (${p.radio} m). `}
          El punto azul eres tú.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  centro: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  mapa: { flex: 1 },
  panel: {
    backgroundColor: color.tarjeta,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
    gap: 12,
    marginTop: -16,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 16, fontWeight: '800', color: color.texto },
  suave: { color: color.suave, fontSize: 13 },
  distancia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: color.azulSuave,
    borderRadius: 12,
    padding: 12,
  },
  distanciaTexto: { color: color.azul, fontWeight: '700', flex: 1 },
  nota: { color: color.suave, fontSize: 12 },
});
