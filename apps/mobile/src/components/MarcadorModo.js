import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { infoModo } from '../utils/desplazamiento';

// Ícono del trabajador en el mapa: persona caminando, moto/carro o quieto
export default function MarcadorModo({ modo, tipoVehiculo, tam = 34 }) {
  const m = infoModo(modo, tipoVehiculo);
  return (
    <View style={[s.circulo, { width: tam, height: tam, borderRadius: tam / 2, backgroundColor: m.color }]}>
      <MaterialCommunityIcons name={m.icono} size={tam * 0.58} color="#fff" />
    </View>
  );
}

const s = StyleSheet.create({
  circulo: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', elevation: 3 },
});
