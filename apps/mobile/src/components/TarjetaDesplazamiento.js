import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { useDesplazamiento } from '../context/DesplazamientoContext';
import { MODOS, infoModo, kmTexto, textoMin } from '../utils/desplazamiento';

// Jornada: cómo se está desplazando ahora y km / tiempo a pie, en vehículo y quieto hoy
export default function TarjetaDesplazamiento() {
  const { modo, dia, tipoVehiculo } = useDesplazamiento();
  const actual = infoModo(modo, tipoVehiculo);
  return (
    <View style={s.tarjeta}>
      <View style={s.cab}>
        <Text style={s.titulo}>Desplazamiento de hoy</Text>
        <View style={[s.chip, { backgroundColor: actual.fondo }]}>
          <MaterialCommunityIcons name={actual.icono} size={15} color={actual.color} />
          <Text style={[s.chipTexto, { color: actual.color }]}>Ahora: {actual.texto.toLowerCase()}</Text>
        </View>
      </View>
      <View style={s.fila}>
        {Object.keys(MODOS).map((k) => {
          const m = infoModo(k, tipoVehiculo);
          return (
            <View key={k} style={s.celda}>
              <MaterialCommunityIcons name={m.icono} size={20} color={m.color} />
              <Text style={s.valor}>{k === 'quieto' ? textoMin(dia.totales[k].seg) : kmTexto(dia.totales[k].km)}</Text>
              <Text style={s.sub}>{k === 'quieto' ? m.texto : `${m.texto} · ${textoMin(dia.totales[k].seg)}`}</Text>
            </View>
          );
        })}
      </View>
      <Text style={s.nota}>Se detecta solo con los pasos del celular y la velocidad del GPS.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: 16, padding: 16, gap: 12 },
  cab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  titulo: { fontWeight: '700', fontSize: 16, color: color.texto },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipTexto: { fontSize: 12, fontWeight: '700' },
  fila: { flexDirection: 'row', gap: 8 },
  celda: { flex: 1, backgroundColor: color.fondo, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 },
  valor: { fontWeight: '800', color: color.texto },
  sub: { color: color.suave, fontSize: 11, textAlign: 'center' },
  nota: { color: color.suave, fontSize: 11 },
});
