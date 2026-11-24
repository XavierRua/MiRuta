import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { yo } from '../data/mock';
import { puntosAutorizacion as puntos, VERSION_AUTORIZACION } from '../constants/autorizacion';
import { useSesion } from '../context/SesionContext';
// soloLectura = se abre desde "Mi perfil" para volver a leer la autorización ya aceptada
export default function ConsentimientoScreen({ route }) {
  const soloLectura = route?.params?.soloLectura ?? false;
  const { aceptarConsentimiento } = useSesion();
  const [acepto, setAcepto] = useState(false);
  return (
    <SafeAreaView style={s.fondo}>
      <ScrollView contentContainerStyle={s.contenido}>
        <View style={s.icono}>
          <Ionicons name="shield-checkmark" size={30} color={color.primario} />
        </View>
        <Text style={s.titulo}>Autorización de tratamiento de datos y geolocalización</Text>
        <Text style={s.version}>
          Versión {VERSION_AUTORIZACION} · {yo.empresa}
        </Text>

        <View style={s.tarjeta}>
          {puntos.map((p, i) => (
            <View key={i} style={s.punto}>
              <Text style={s.numero}>{i + 1}</Text>
              <Text style={s.textoPunto}>{p}</Text>
            </View>
          ))}
        </View>

        {!soloLectura && (
          <>
            <Pressable style={s.check} onPress={() => setAcepto(!acepto)}>
              <Ionicons
                name={acepto ? 'checkbox' : 'square-outline'}
                size={26}
                color={acepto ? color.primario : color.suave}
              />
              <Text style={s.checkTexto}>
                He leído y autorizo de forma previa, expresa e informada el tratamiento de mis datos personales y de mi
                ubicación.
              </Text>
            </Pressable>

            <Pressable style={[s.boton, !acepto && s.botonOff]} disabled={!acepto} onPress={aceptarConsentimiento}>
              <Text style={s.botonTexto}>Aceptar y continuar</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 22, paddingBottom: 40 },
  icono: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: color.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  titulo: { fontSize: 22, fontWeight: '800', color: color.texto },
  version: { color: color.suave, marginTop: 4, marginBottom: 16 },
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: 16, padding: 16, gap: 14 },
  punto: { flexDirection: 'row', gap: 12 },
  numero: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color.primarioSuave,
    color: color.primario,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '700',
    fontSize: 12,
  },
  textoPunto: { flex: 1, color: color.texto, lineHeight: 20, fontSize: 14 },
  check: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 20 },
  checkTexto: { flex: 1, color: color.texto, lineHeight: 20 },
  boton: {
    backgroundColor: color.primario,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  botonOff: { opacity: 0.4 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
