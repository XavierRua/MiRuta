import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { color } from '../theme/colors';

// Tarjeta de indicador. Todos los de "Indicadores diarios" usan este mismo diseño:
// círculo con ícono, valor, título y detalle. Todas miden igual para quedar alineadas.
// "tono" (opcional) pinta el círculo y el valor con el color del resultado: { color, fondo }
// familia: 'ion' (Ionicons, por defecto) o 'mci' (MaterialCommunityIcons: persona caminando, moto, carro)
// onPress (opcional): la tarjeta se puede tocar (p. ej. pausas). activo: borde del color del tono.
export default function Dato({ icono, familia = 'ion', valor, texto, detalle, ancho, tono, onPress, activo }) {
  const Icono = familia === 'mci' ? MaterialCommunityIcons : Ionicons;
  const base = [
    s.dato,
    ancho ? { width: ancho } : { flex: 1 },
    activo && { borderWidth: 2, borderColor: tono?.color ?? color.primario },
  ];
  const Caja = onPress ? Pressable : View;
  return (
    <Caja onPress={onPress} style={onPress ? ({ pressed }) => [...base, pressed && { opacity: 0.7 }] : base}>
      <View style={[s.icono, tono && { backgroundColor: tono.fondo }]}>
        <Icono name={icono} size={26} color={tono ? tono.color : color.primario} />
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
    </Caja>
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
