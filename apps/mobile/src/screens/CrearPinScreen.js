import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TecladoPin from '../components/TecladoPin';
import { color } from '../theme/colors';
import { SEGURIDAD } from '../config/seguridad';
import { useSesion } from '../context/SesionContext';
import { pinDebil } from '../services/pin';

// Después de vincular el celular: el trabajador crea su PIN y lo confirma
export default function CrearPinScreen() {
  const { crearPin, vinculo } = useSesion();
  const [primero, setPrimero] = useState(null);
  const [error, setError] = useState(null);
  const [reinicio, setReinicio] = useState(0);

  const completar = async (pin) => {
    if (!primero) {
      if (pinDebil(pin)) {
        setError('Ese PIN es muy fácil de adivinar. Elige otro.');
        setReinicio((r) => r + 1);
        return;
      }
      setError(null);
      setPrimero(pin);
      setReinicio((r) => r + 1);
      return;
    }
    if (pin !== primero) {
      setError('Los PIN no coinciden. Empieza de nuevo.');
      setPrimero(null);
      setReinicio((r) => r + 1);
      return;
    }
    await crearPin(pin);
  };

  return (
    <SafeAreaView style={s.fondo}>
      <View style={s.contenido}>
        <View style={s.icono}>
          <Ionicons name="checkmark-circle" size={30} color={color.verde} />
        </View>
        <Text style={s.ok}>
          Celular vinculado a {vinculo?.trabajador?.nombres} {vinculo?.trabajador?.apellidos}
        </Text>
        <Text style={s.titulo}>{primero ? 'Confirma tu PIN' : `Crea tu PIN de ${SEGURIDAD.largoPin} dígitos`}</Text>
        <Text style={s.sub}>Lo usarás cada vez que entres a MiRuta. No lo compartas con nadie.</Text>
        <TecladoPin onCompletar={completar} error={error} reinicio={reinicio} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  icono: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.verdeSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ok: { color: color.verde, fontWeight: '600', marginBottom: 12 },
  titulo: { fontSize: 22, fontWeight: '800', color: color.texto },
  sub: { color: color.suave, textAlign: 'center', marginBottom: 6 },
});
