import { StyleSheet, Text, View } from 'react-native';
import { color } from '../theme/colors';

// Bloque blanco con un título pequeño en mayúsculas
export default function Seccion({ titulo, children }) {
  return (
    <View style={s.seccion}>
      <Text style={s.titulo}>{titulo}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  seccion: { backgroundColor: color.tarjeta, borderRadius: 16, padding: 16, gap: 10 },
  titulo: { fontSize: 12, fontWeight: '700', color: color.suave, textTransform: 'uppercase', letterSpacing: 0.5 },
});
