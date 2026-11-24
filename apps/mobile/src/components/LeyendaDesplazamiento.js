import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { MODOS, infoModo } from '../utils/desplazamiento';

// Leyenda del mapa: íconos y colores de la línea según cómo se desplaza
export default function LeyendaDesplazamiento({ tipoVehiculo, conLinea = true }) {
  return (
    <View style={s.leyenda}>
      {Object.keys(MODOS).map((k) => {
        const m = infoModo(k, tipoVehiculo);
        return (
          <View key={k} style={s.item}>
            <MaterialCommunityIcons name={m.icono} size={16} color={m.color} />
            {conLinea && k !== 'quieto' && (
              <View style={[s.linea, { backgroundColor: m.color }, k === 'a_pie' && s.punteada]} />
            )}
            <Text style={s.texto}>{m.texto}</Text>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  linea: { width: 16, height: 4, borderRadius: 2 },
  punteada: { opacity: 0.7 },
  texto: { color: color.suave, fontSize: 12 },
});
