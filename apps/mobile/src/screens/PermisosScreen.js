import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { pasosPermisos as pasos } from '../constants/permisos';
import { useSesion } from '../context/SesionContext';
export default function PermisosScreen() {
  const { completarPermisos } = useSesion();
  const [listos, setListos] = useState([]);
  const completo = listos.length === pasos.length;
  return (
    <SafeAreaView style={s.fondo}>
      <ScrollView contentContainerStyle={s.contenido}>
        <Text style={s.titulo}>Configura tu celular</Text>
        <Text style={s.sub}>
          Solo una vez. Después no tendrás que hacer nada: el rastreo se enciende y se apaga solo según tu horario.
        </Text>

        {pasos.map((p) => {
          const ok = listos.includes(p.id);
          return (
            <View key={p.id} style={s.tarjeta}>
              <View style={[s.icono, ok && { backgroundColor: color.verdeSuave }]}>
                <Ionicons name={ok ? 'checkmark' : p.icono} size={24} color={ok ? color.verde : color.primario} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.pasoTitulo}>{p.titulo}</Text>
                <Text style={s.pasoDetalle}>{p.detalle}</Text>
                {!ok && (
                  <Pressable style={s.botonPeq} onPress={() => setListos([...listos, p.id])}>
                    <Text style={s.botonPeqTexto}>{p.boton}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        <Pressable style={[s.boton, !completo && s.botonOff]} disabled={!completo} onPress={completarPermisos}>
          <Text style={s.botonTexto}>Listo</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 22, gap: 14 },
  titulo: { fontSize: 24, fontWeight: '800', color: color.texto },
  sub: { color: color.suave, lineHeight: 20, marginBottom: 6 },
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 14 },
  icono: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: color.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoTitulo: { fontWeight: '700', fontSize: 15, color: color.texto },
  pasoDetalle: { color: color.suave, marginTop: 4, lineHeight: 19 },
  botonPeq: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderColor: color.primario,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  botonPeqTexto: { color: color.primario, fontWeight: '700' },
  boton: {
    backgroundColor: color.primario,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  botonOff: { opacity: 0.4 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
