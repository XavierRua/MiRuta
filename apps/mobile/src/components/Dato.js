import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';

// Tarjeta de indicador. Las cuatro de Jornada usan este mismo diseño:
// círculo con ícono, valor, título y detalle. Todas miden igual para quedar alineadas.
// "tono" (opcional) pinta el círculo y el valor con el color del resultado: { color, fondo }
export default function Dato({ icono, valor, texto, detalle, ancho, tono }) {
  return (
    <View style={[s.dato, ancho ? { width: ancho } : { flex: 1 }]}>
      <View style={[s.icono, tono && { backgroundColor: tono.fondo }]}>
        <Ionicons name={icono} size={26} color={tono ? tono.color : color.primario} />
      </View>
      <Text
        style={[s.valor, tono && { color: tono.color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {valor}
      </Text>
      <Text style={s.texto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {texto}
      </Text>
      <Text
        style={[s.detalle, tono?.detalleColor && { color: tono.detalleColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {detalle ?? ' '}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  dato: {
    backgroundColor: color.tarjeta,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  icono: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: color.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valor: { fontSize: 18, fontWeight: '800', color: color.texto, marginTop: 8 },
  texto: { color: color.texto, fontSize: 13, fontWeight: '600', marginTop: 4 },
  detalle: { color: color.suave, fontSize: 11, marginTop: 2 },
});
