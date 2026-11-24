import { StyleSheet, Text, View } from 'react-native';
import { color } from '../theme/colors';

// Fila "dato: valor". Con ok={true} el valor sale en verde
export default function Fila({ k, v, ok }) {
  return (
    <View style={s.fila}>
      <Text style={s.k}>{k}</Text>
      <Text style={[s.v, ok && { color: color.verde }]}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  k: { color: color.suave },
  v: { color: color.texto, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
