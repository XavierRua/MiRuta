import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TecladoPin from '../components/TecladoPin';
import { color } from '../theme/colors';
import { useSesion } from '../context/SesionContext';

// Ingreso diario: el celular ya está vinculado, el trabajador solo escribe su PIN
export default function LoginScreen() {
  const { ingresarConPin, vinculo } = useSesion();
  const [error, setError] = useState(null);
  const [reinicio, setReinicio] = useState(0);
  const [verificando, setVerificando] = useState(false);
  const t = vinculo?.trabajador ?? { nombres: '', apellidos: '' };

  const completar = async (pin) => {
    setVerificando(true);
    const r = await ingresarConPin(pin);
    setVerificando(false);
    if (!r.ok && !r.bloqueado) {
      setError(`PIN incorrecto. Te quedan ${r.restantes} ${r.restantes === 1 ? 'intento' : 'intentos'}.`);
      setReinicio((x) => x + 1);
    }
  };

  return (
    <SafeAreaView style={s.fondo}>
      <View style={s.contenido}>
        <View style={s.avatar}>
          <Text style={s.avatarTexto}>
            {t.nombres[0]}
            {t.apellidos[0]}
          </Text>
        </View>
        <Text style={s.titulo}>Hola, {t.nombres}</Text>
        <Text style={s.sub}>{vinculo?.empresa}</Text>
        <Text style={s.instruccion}>Escribe tu PIN</Text>
        <TecladoPin onCompletar={completar} error={error} reinicio={reinicio} deshabilitado={verificando} />
        <Pressable
          onPress={() =>
            Alert.alert(
              '¿Olvidaste tu PIN?',
              'Pide a tu administrador un nuevo código de activación desde el panel web. Con ese código vuelves a vincular este celular y creas un PIN nuevo.',
            )
          }
        >
          <Text style={s.olvide}>Olvidé mi PIN</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 4 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontSize: 26, fontWeight: '800', color: '#9a3412' },
  titulo: { fontSize: 24, fontWeight: '800', color: color.texto, marginTop: 10 },
  sub: { color: color.suave },
  instruccion: { color: color.texto, fontWeight: '600', marginTop: 18 },
  olvide: { color: color.primario, fontWeight: '600', marginTop: 16 },
});
