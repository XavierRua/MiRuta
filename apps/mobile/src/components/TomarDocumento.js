import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import CampoFecha from './CampoFecha';
import { tomarFotoDocumento } from '../services/fotos';
import { aTexto, deTexto } from '../utils/documentos';

// Tomar la foto de un documento del vehículo y su fecha de vencimiento (registro y renovación)
export default function TomarDocumento({ doc, valor, onCambiar }) {
  const [ocupado, setOcupado] = useState(false);
  const foto = valor?.foto;
  const vence = valor?.vence ? deTexto(valor.vence) : null;

  const tomar = async () => {
    try {
      setOcupado(true);
      const f = await tomarFotoDocumento();
      if (f) {
        // Fecha sugerida: un año desde hoy (el trabajador la corrige con la del documento)
        const sugerida = new Date();
        sugerida.setFullYear(sugerida.getFullYear() + 1);
        onCambiar({ foto: f, vence: doc.vence ? (valor?.vence ?? aTexto(sugerida)) : null });
      }
    } catch (e) {
      Alert.alert('No se pudo tomar la foto', e.message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <View style={s.caja}>
      <View style={s.cab}>
        <Ionicons name={doc.icono} size={18} color={color.primario} />
        <Text style={s.nombre}>{doc.nombre}</Text>
        {foto && <Ionicons name="checkmark-circle" size={18} color={color.verde} />}
      </View>
      {foto ? (
        <View style={s.fila}>
          <Image source={{ uri: foto.uri }} style={s.foto} />
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={s.peso}>Foto lista · {foto.pesoKB ?? '?'} KB</Text>
            <Pressable style={s.repetir} onPress={tomar} disabled={ocupado}>
              <Ionicons name="camera-reverse" size={16} color={color.primario} />
              <Text style={s.repetirTexto}>Repetir foto</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={s.boton} onPress={tomar} disabled={ocupado}>
          {ocupado ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={s.botonTexto}>Tomar foto</Text>
            </>
          )}
        </Pressable>
      )}
      {doc.vence && foto && (
        <CampoFecha
          etiqueta="Fecha de vencimiento (verifícala en el documento)"
          valor={vence}
          onCambiar={(f) => onCambiar({ ...valor, vence: aTexto(f) })}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  caja: { backgroundColor: color.tarjeta, borderRadius: 16, padding: 14, gap: 10 },
  cab: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombre: { flex: 1, fontWeight: '700', color: color.texto },
  fila: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  foto: { width: 110, height: 72, borderRadius: 8, backgroundColor: color.fondo },
  peso: { color: color.suave, fontSize: 12 },
  repetir: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  repetirTexto: { color: color.primario, fontWeight: '600' },
  boton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.primario,
    borderRadius: 12,
    padding: 13,
  },
  botonTexto: { color: '#fff', fontWeight: '700' },
});
