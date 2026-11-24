import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { SEGURIDAD } from '../config/seguridad';

const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'borrar'];

// Puntos del PIN + teclado numérico. Llama a onCompletar(pin) al llegar al largo del PIN.
// Cambia "reinicio" (por ejemplo, un número que aumenta) para limpiar lo escrito.
export default function TecladoPin({ onCompletar, error, reinicio, deshabilitado }) {
  const [pin, setPin] = useState('');

  useEffect(() => setPin(''), [reinicio]);

  const tocar = (t) => {
    if (deshabilitado) return;
    if (t === 'borrar') return setPin((p) => p.slice(0, -1));
    if (!t || pin.length >= SEGURIDAD.largoPin) return;
    const nuevo = pin + t;
    setPin(nuevo);
    if (nuevo.length === SEGURIDAD.largoPin) setTimeout(() => onCompletar(nuevo), 120);
  };

  return (
    <View style={s.contenedor}>
      <View style={s.puntos}>
        {Array.from({ length: SEGURIDAD.largoPin }, (_, i) => (
          <View key={i} style={[s.punto, i < pin.length && s.puntoLleno, error && s.puntoError]} />
        ))}
      </View>
      <Text style={s.error}>{error ?? ' '}</Text>
      <View style={s.teclado}>
        {teclas.map((t, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [s.tecla, !t && s.vacia, pressed && t && s.presionada]}
            onPress={() => tocar(t)}
            disabled={!t}
            accessibilityLabel={t === 'borrar' ? 'Borrar' : t}
          >
            {t === 'borrar' ? (
              <Ionicons name="backspace-outline" size={26} color={color.texto} />
            ) : (
              <Text style={s.numero}>{t}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  contenedor: { alignItems: 'center', gap: 8 },
  puntos: { flexDirection: 'row', gap: 18, marginVertical: 8 },
  punto: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: color.suave },
  puntoLleno: { backgroundColor: color.primario, borderColor: color.primario },
  puntoError: { borderColor: color.rojo },
  error: { color: color.rojo, fontWeight: '600', textAlign: 'center', minHeight: 20 },
  teclado: { flexDirection: 'row', flexWrap: 'wrap', width: 276, gap: 12, justifyContent: 'center', marginTop: 4 },
  tecla: {
    width: 80,
    height: 64,
    borderRadius: 16,
    backgroundColor: color.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacia: { backgroundColor: 'transparent' },
  presionada: { backgroundColor: color.primarioSuave },
  numero: { fontSize: 26, fontWeight: '600', color: color.texto },
});
