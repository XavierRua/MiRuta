import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { config } from '../config/app';
import { useJornadaDia } from '../context/JornadaDiaContext';
import { hhmm } from '../utils/reportes';

// Reporte de incidentes: en cualquier momento del horario. Avisa con sonido al administrador,
// al supervisor y a SST, que se comunican con el trabajador.
export default function TarjetaIncidentes({ navigation }) {
  const { dia, simularApagadoDemo } = useJornadaDia();
  return (
    <View style={s.tarjeta}>
      {/* Mismo encabezado que Horas extras: círculo con ícono, título y explicación */}
      <View style={s.cab}>
        <View style={s.icono}>
          <MaterialCommunityIcons name="account-hard-hat" size={22} color={color.rojo} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo}>Incidentes laborales</Text>
          <Text style={s.sub}>
            {dia.incidentes.length
              ? `${dia.incidentes.length} reportado${dia.incidentes.length > 1 ? 's' : ''} hoy · tu supervisor y SST ya fueron avisados`
              : 'Si te pasa algo en el trabajo, repórtalo aquí. Avisamos a tu supervisor y a SST.'}
          </Text>
        </View>
      </View>
      <Pressable style={s.boton} onPress={() => navigation.navigate('NuevoIncidente')}>
        <Ionicons name="warning" size={20} color="#fff" />
        <Text style={s.botonTexto}>Reportar un incidente</Text>
      </Pressable>
      {dia.incidentes.map((i) => (
        <View key={i.id} style={s.fila}>
          <Ionicons name="alert-circle" size={16} color={color.rojo} />
          <Text style={s.filaTexto} numberOfLines={2}>
            {hhmm(new Date(i.hora))} · {i.descripcion}
          </Text>
          <Text style={[s.estado, !i.puedeContinuar && { color: color.rojo }]}>
            {i.puedeContinuar ? 'Continúa' : 'No continúa'}
          </Text>
        </View>
      ))}
      {config.modoDemo && dia.incidentes.length > 0 && !dia.gpsApagado && (
        <Pressable onPress={simularApagadoDemo}>
          <Text style={s.demo}>Demo: simular que SST apaga el GPS</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: 16, padding: 16, gap: 10 },
  cab: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.rojoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontWeight: '700', fontSize: 16, color: color.texto },
  sub: { color: color.suave, fontSize: 13, marginTop: 2, lineHeight: 18 },
  boton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.rojo,
    borderRadius: 12,
    paddingVertical: 14,
  },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filaTexto: { flex: 1, color: color.texto, fontSize: 13 },
  estado: { fontSize: 11, fontWeight: '700', color: color.verde },
  demo: { color: color.suave, fontSize: 12, textAlign: 'center', textDecorationLine: 'underline' },
});
