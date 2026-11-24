import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import GeocercaEnMapa from './GeocercaEnMapa';
import LeyendaDesplazamiento from './LeyendaDesplazamiento';
import { usePermisos } from '../context/PermisosContext';
import { useDesplazamiento } from '../context/DesplazamientoContext';
import { MODOS } from '../utils/desplazamiento';

// Parte el recorrido en tramos del mismo modo (con permiso) o en un solo tramo azul (sin permiso)
function tramosPorModo(recorrido, conModo) {
  const tramos = [];
  recorrido.forEach((p, i) => {
    const modo = conModo ? (p.m ?? 'vehiculo') : 'vehiculo';
    const ultimo = tramos[tramos.length - 1];
    if (ultimo?.modo === modo) ultimo.puntos.push(p);
    else
      tramos.push({
        modo,
        color: conModo ? MODOS[modo].color : color.azul,
        puntos: ultimo ? [ultimo.puntos[ultimo.puntos.length - 1], p] : [p], // une los tramos
      });
  });
  return tramos.filter((t) => t.puntos.length > 1);
}
import { color } from '../theme/colors';
import { centroDe } from '../utils/visitas';

// Mapa de la visita: geocerca (la configuró el administrador), recorrido y cada entrada/salida
export default function MapaVisita({ p, periodos = [], recorrido = [], alto = 240 }) {
  const conModo = usePermisos().puede('desplazamiento.ver');
  const { tipoVehiculo } = useDesplazamiento();
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
    <>
      <View style={[s.caja, { height: alto }]}>
        <MapView style={StyleSheet.absoluteFill} initialRegion={region} toolbarEnabled={false}>
          <GeocercaEnMapa p={p} />
          {/* Recorrido: un color por tramo según cómo se desplazaba (a pie / en vehículo) */}
          {tramosPorModo(recorrido, conModo).map((t, i) => (
            <Polyline
              key={`r${i}`}
              coordinates={t.puntos.map((x) => ({ latitude: x.lat, longitude: x.lng }))}
              strokeColor={t.color}
              strokeWidth={4}
              lineDashPattern={t.modo === 'a_pie' ? [6, 6] : undefined}
            />
          ))}
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
      {conModo && recorrido.length > 1 && <LeyendaDesplazamiento tipoVehiculo={tipoVehiculo} />}
    </>
  );
}

const s = StyleSheet.create({
  caja: { borderRadius: 12, overflow: 'hidden', backgroundColor: color.fondo },
});
