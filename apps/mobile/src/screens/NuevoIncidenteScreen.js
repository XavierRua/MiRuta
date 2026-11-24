import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { useJornadaDia } from '../context/JornadaDiaContext';
import { tomarFotoTarea } from '../services/fotos';
import { obtenerUbicacion } from '../services/ubicacion';
import { ahoraServidor } from '../services/horaServidor';
import { hhmm } from '../utils/reportes';

// Reporte de incidente: descripción, fotos opcionales, si puede continuar, y fecha/hora/GPS automáticos
export default function NuevoIncidenteScreen({ navigation }) {
  const { reportarIncidente } = useJornadaDia();
  const [descripcion, setDescripcion] = useState('');
  const [fotos, setFotos] = useState([]);
  const [puedeContinuar, setPuedeContinuar] = useState(null);
  const [ubicacion, setUbicacion] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    obtenerUbicacion()
      .then(setUbicacion)
      .catch(() => {});
  }, []);

  const foto = async () => {
    try {
      const f = await tomarFotoTarea();
      if (f) setFotos((l) => [...l, f].slice(0, 3));
    } catch (e) {
      Alert.alert('No se pudo tomar la foto', e.message);
    }
  };

  const enviar = async () => {
    try {
      setOcupado(true);
      await reportarIncidente({ descripcion: descripcion.trim(), fotos, puedeContinuar, ubicacion });
      Alert.alert(
        'Incidente reportado',
        'Avisamos con sonido al administrador, a tu supervisor y a SST. Te contactarán en breve.',
        [{ text: 'Listo', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('No se pudo enviar', e.message);
    } finally {
      setOcupado(false);
    }
  };

  const listo = descripcion.trim().length >= 10 && puedeContinuar != null;

  return (
    <ScrollView style={s.fondo} contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
      <View style={s.auto}>
        <Text style={s.autoTexto}>
          <Ionicons name="time" size={13} /> {ahoraServidor().toLocaleDateString('es-CO')} · {hhmm(ahoraServidor())}{' '}
          (hora oficial)
        </Text>
        <Text style={s.autoTexto}>
          <Ionicons name="location" size={13} />{' '}
          {ubicacion
            ? (ubicacion.direccion ?? `${ubicacion.lat.toFixed(5)}, ${ubicacion.lng.toFixed(5)}`)
            : 'Tomando la ubicación…'}
        </Text>
      </View>

      <Text style={s.etiqueta}>¿Qué pasó?</Text>
      <TextInput
        style={s.input}
        multiline
        placeholder="Describe la novedad (mínimo 10 letras)"
        value={descripcion}
        onChangeText={setDescripcion}
      />

      <Text style={s.etiqueta}>Fotos (opcional, hasta 3)</Text>
      <View style={s.fotos}>
        {fotos.map((f, i) => (
          <Image key={i} source={{ uri: f.uri }} style={s.foto} />
        ))}
        {fotos.length < 3 && (
          <Pressable style={[s.foto, s.agregar]} onPress={foto}>
            <Ionicons name="camera" size={24} color={color.suave} />
          </Pressable>
        )}
      </View>

      <Text style={s.etiqueta}>¿Te sientes en condiciones de continuar?</Text>
      <View style={s.opciones}>
        {[
          [true, 'Sí, puedo continuar', color.verde],
          [false, 'No puedo continuar', color.rojo],
        ].map(([v, t, c]) => (
          <Pressable
            key={t}
            style={[s.opcion, puedeContinuar === v && { backgroundColor: c, borderColor: c }]}
            onPress={() => setPuedeContinuar(v)}
          >
            <Text style={[s.opcionTexto, puedeContinuar === v && { color: '#fff' }]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={[s.boton, !listo && s.botonOff]} disabled={!listo || ocupado} onPress={enviar}>
        {ocupado ? <ActivityIndicator color="#fff" /> : <Text style={s.botonTexto}>Enviar incidente</Text>}
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 20, gap: 10 },
  auto: { backgroundColor: color.tarjeta, borderRadius: 12, padding: 12, gap: 4 },
  autoTexto: { color: color.suave, fontSize: 13 },
  etiqueta: { fontWeight: '700', color: color.texto, marginTop: 6 },
  input: { backgroundColor: color.tarjeta, borderRadius: 12, padding: 12, minHeight: 100, textAlignVertical: 'top' },
  fotos: { flexDirection: 'row', gap: 8 },
  foto: { width: 84, height: 84, borderRadius: 10, backgroundColor: color.tarjeta },
  agregar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.borde,
  },
  opciones: { gap: 8 },
  opcion: {
    borderWidth: 1.5,
    borderColor: color.borde,
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    backgroundColor: color.tarjeta,
  },
  opcionTexto: { fontWeight: '700', color: color.texto },
  boton: { backgroundColor: color.rojo, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 10 },
  botonOff: { opacity: 0.45 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
