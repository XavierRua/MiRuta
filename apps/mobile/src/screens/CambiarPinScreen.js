import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TecladoPin from '../components/TecladoPin';
import { color } from '../theme/colors';
import { SEGURIDAD } from '../config/seguridad';
import { useSesion } from '../context/SesionContext';
import { guardarPin, pinDebil, verificarPin } from '../services/pin';

const PASOS = {
  actual: ['Escribe tu PIN actual', 'Para confirmar que eres tú.'],
  nuevo: [`Crea tu nuevo PIN de ${SEGURIDAD.largoPin} dígitos`, 'No uses números seguidos ni repetidos.'],
  confirmar: ['Confirma tu nuevo PIN', 'Escríbelo otra vez.'],
};

// Cambiar la contraseña (PIN) de este celular: PIN actual → nuevo → confirmar.
// Si se equivoca varias veces con el PIN actual, se bloquea igual que al ingresar.
export default function CambiarPinScreen({ navigation }) {
  const { salir } = useSesion();
  const [paso, setPaso] = useState('actual');
  const [nuevo, setNuevo] = useState(null);
  const [error, setError] = useState(null);
  const [reinicio, setReinicio] = useState(0);
  const limpiar = () => setReinicio((r) => r + 1);

  const completar = async (pin) => {
    if (paso === 'actual') {
      const r = await verificarPin(pin);
      if (r.ok) {
        setError(null);
        setPaso('nuevo');
      } else if (r.bloqueado) {
        Alert.alert('PIN bloqueado', 'Te equivocaste demasiadas veces. Pide ayuda a tu administrador.');
        salir();
      } else {
        setError(`PIN incorrecto. Te quedan ${r.restantes} intentos.`);
      }
      return limpiar();
    }
    if (paso === 'nuevo') {
      if (pinDebil(pin)) {
        setError('Ese PIN es muy fácil de adivinar. Elige otro.');
        return limpiar();
      }
      setError(null);
      setNuevo(pin);
      setPaso('confirmar');
      return limpiar();
    }
    if (pin !== nuevo) {
      setError('Los PIN no coinciden. Empieza de nuevo.');
      setNuevo(null);
      setPaso('nuevo');
      return limpiar();
    }
    await guardarPin(pin);
    Alert.alert('Listo', 'Tu PIN se cambió. Úsalo la próxima vez que entres.');
    navigation.goBack();
  };

  const [titulo, sub] = PASOS[paso];
  return (
    <View style={s.fondo}>
      <View style={s.icono}>
        <Ionicons name="key" size={28} color={color.primario} />
      </View>
      <Text style={s.titulo}>{titulo}</Text>
      <Text style={s.sub}>{sub}</Text>
      <TecladoPin onCompletar={completar} error={error} reinicio={reinicio} />
    </View>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  icono: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  titulo: { fontSize: 21, fontWeight: '800', color: color.texto, textAlign: 'center' },
  sub: { color: color.suave, textAlign: 'center', marginBottom: 6 },
});
