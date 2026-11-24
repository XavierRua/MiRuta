import { Text, View, StyleSheet } from 'react-native';
import { Circle, Marker, Polygon } from 'react-native-maps';
import { color } from '../theme/colors';
import { centroDe } from '../utils/visitas';

const RELLENO = { obra: 'rgba(234,88,12,0.12)', zona: 'rgba(124,58,237,0.12)', ruta: 'rgba(37,99,235,0.10)' };
const BORDE = { obra: color.naranja, zona: color.morado, ruta: color.azul };

// Geocerca que dibujó el administrador: círculo de la obra, área de la zona o radio de cada punto de la ruta.
// Con conPines, marca también el lugar (o los puntos numerados de la ruta).
export default function GeocercaEnMapa({ p, conPines = false }) {
  const c = centroDe(p);
  return (
    <>
      {p.tipo === 'obra' && (
        <Circle
          center={{ latitude: c.lat, longitude: c.lng }}
          radius={p.radio}
          strokeColor={BORDE.obra}
          strokeWidth={2}
          fillColor={RELLENO.obra}
        />
      )}
      {p.tipo === 'zona' && (
        <Polygon
          coordinates={p.area.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))}
          strokeColor={BORDE.zona}
          strokeWidth={2}
          fillColor={RELLENO.zona}
        />
      )}
      {p.tipo === 'ruta' &&
        p.puntos.map((x, i) => (
          <Circle
            key={`g${i}`}
            center={{ latitude: x.lat, longitude: x.lng }}
            radius={p.radio}
            strokeColor={BORDE.ruta}
            fillColor={RELLENO.ruta}
          />
        ))}
      {conPines &&
        (p.tipo === 'ruta' ? (
          p.puntos.map((x, i) => (
            <Marker
              key={`p${i}`}
              coordinate={{ latitude: x.lat, longitude: x.lng }}
              title={x.nombre}
              description={x.direccion}
            >
              <View style={[s.pin, { backgroundColor: color.azul }]}>
                <Text style={s.pinTexto}>{i + 1}</Text>
              </View>
            </Marker>
          ))
        ) : (
          <Marker
            coordinate={{ latitude: c.lat, longitude: c.lng }}
            title={p.puntos[0]?.nombre ?? p.titulo}
            description={p.puntos[0]?.direccion}
            pinColor={p.tipo === 'zona' ? 'violet' : 'orange'}
          />
        ))}
    </>
  );
}

const s = StyleSheet.create({
  pin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pinTexto: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
