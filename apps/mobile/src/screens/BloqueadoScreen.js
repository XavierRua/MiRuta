import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { config } from '../config/app';
import { SEGURIDAD } from '../config/seguridad';
import { useSesion } from '../context/SesionContext';

// Se muestra después de varios PIN incorrectos. Solo el administrador puede reactivar el acceso.
export default function BloqueadoScreen() {
  const { desbloquearDemo } = useSesion();
  return (
    <SafeAreaView style={s.fondo}>
      <View style={s.contenido}>
        <View style={s.icono}>
          <Ionicons name="lock-closed" size={34} color={color.rojo} />
        </View>
        <Text style={s.titulo}>Acceso bloqueado</Text>
        <Text style={s.texto}>
          Se escribió un PIN incorrecto {SEGURIDAD.maxIntentos} veces. Por seguridad bloqueamos MiRuta en este celular y
          avisamos a tu administrador.
        </Text>
        <Text style={s.texto}>Pídele un nuevo código de activación para volver a entrar.</Text>
        {config.modoDemo && (
          <Pressable style={s.demo} onPress={desbloquearDemo}>
            <Text style={s.demoTexto}>Desbloquear (solo en la demo)</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  icono: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: color.rojoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontSize: 24, fontWeight: '800', color: color.texto },
  texto: { color: color.suave, textAlign: 'center', lineHeight: 21 },
  demo: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  demoTexto: { color: color.suave, fontWeight: '600' },
});
