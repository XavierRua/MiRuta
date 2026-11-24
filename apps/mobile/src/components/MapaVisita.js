import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import GeocercaEnMapa from './GeocercaEnMapa';
import { color } from '../theme/colors';
import { centroDe } from '../utils/visitas';

// Mapa de la visita: geocerca (la configuró el administrador), recorrido y cada entrada/salida
export default function MapaVisita({ p, periodos = [], recorrido = [], alto = 240 }) {
  const c = centroDe(p);
  const puntos =
    p.tipo === 'zona'
      ? p.area.map(([lat, lng]) => ({ lat, lng }))
      : p.tipo === 'ruta'
        ? p.puntos
        : [
            { lat: c.lat + p.radio / 111320, lng: c.lng },
            { lat: c.lat - p.radio / 111320, lng: c.lng },
          ];
  const todos = [...puntos, ...recorrido];
  const lats = todos.map((x) => x.lat);
  const lngs = todos.map((x) => x.lng);
  const region = {
    latitude: (Math.max(...lats) + Math.min(...lats)) / 2,
    longitude: (Math.max(...lngs) + Math.min(...lngs)) / 2,
    latitudeDelta: Math.max(0.004, (Math.max(...lats) - Math.min(...lats)) * 1.6),
    longitudeDelta: Math.max(0.004, (Math.max(...lngs) - Math.min(...lngs)) * 1.6),
  };
  const hora = (iso) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  // Ubicación de cada entrada: el primer punto del recorrido desde esa hora
  const lugarEn = (iso) => recorrido.find((x) => x.t >= iso) ?? c;

  return (
    <View style={[s.caja, { height: alto }]}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={region} toolbarEnabled={false}>
        <GeocercaEnMapa p={p} />
        {recorrido.length > 1 && (
          <Polyline
            coordinates={recorrido.map((x) => ({ latitude: x.lat, longitude: x.lng }))}
            strokeColor={color.azul}
            strokeWidth={4}
          />
        )}
        {periodos.map((x, i) => {
          const e = lugarEn(x.entrada);
          return (
            <Marker
              key={`e${i}`}
              coordinate={{ latitude: e.lat, longitude: e.lng }}
              pinColor="green"
              title={`Entrada ${i + 1}`}
              description={hora(x.entrada)}
            />
          );
        })}
        {periodos
          .filter((x) => x.salida && x.lugarSalida)
          .map((x, i) => (
            <Marker
              key={`s${i}`}
              coordinate={{ latitude: x.lugarSalida.lat, longitude: x.lugarSalida.lng }}
              pinColor="red"
              title={`Salida ${i + 1}`}
              description={hora(x.salida)}
            />
          ))}
      </MapView>
    </View>
  );
}

const s = StyleSheet.create({
  caja: { borderRadius: 12, overflow: 'hidden', backgroundColor: color.fondo },
});
