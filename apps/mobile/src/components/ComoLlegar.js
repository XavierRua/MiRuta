import { Alert, Linking, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { urlComoLlegar } from '../utils/visitas';

// Botón "Cómo llegar": el trabajador elige Google Maps o Waze
export default function ComoLlegar({ destino, estilo }) {
  const abrir = () =>
    Alert.alert('Cómo llegar', `${destino.nombre}${destino.direccion ? `\n${destino.direccion}` : ''}`, [
      { text: 'Google Maps', onPress: () => Linking.openURL(urlComoLlegar(destino, 'google')) },
      { text: 'Waze', onPress: () => Linking.openURL(urlComoLlegar(destino, 'waze')) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  return (
    <Pressable style={[s.boton, estilo]} onPress={abrir}>
      <Ionicons name="navigate" size={18} color="#fff" />
      <Text style={s.texto}>Cómo llegar</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  boton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.primario,
    borderRadius: 12,
    padding: 14,
  },
  texto: { color: '#fff', fontWeight: '700' },
});
