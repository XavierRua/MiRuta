import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { fechaLarga } from '../utils/documentos';

// Una fila de documento en Mi perfil: foto (o ícono), nombre, vencimiento y estado con color
export default function DocumentoFila({ doc, onPress }) {
  const e = doc.estado;
  const sinCargar = doc.grupo === 'adicional' ? !doc.cargado : !doc.foto;
  return (
    <Pressable style={({ pressed }) => [s.fila, pressed && { opacity: 0.6 }]} onPress={onPress}>
      {doc.foto?.uri ? (
        <Image source={{ uri: doc.foto.uri }} style={s.miniatura} />
      ) : (
        <View style={[s.miniatura, s.icono]}>
          <Ionicons name={doc.icono} size={20} color={color.suave} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.nombre} numberOfLines={2}>
          {doc.nombre}
          {doc.privado ? '  ' : ''}
          {doc.privado && <Ionicons name="lock-closed" size={12} color={color.suave} />}
        </Text>
        <Text style={s.sub}>
          {sinCargar
            ? doc.grupo === 'adicional'
              ? 'Pendiente: lo sube SST'
              : 'Falta la foto'
            : doc.vence
              ? `Vigente hasta ${fechaLarga(doc.vence)}`
              : 'Sin fecha de vencimiento'}
        </Text>
      </View>
      {e && !sinCargar ? (
        <View style={[s.chip, { backgroundColor: e.fondo }]}>
          <View style={[s.punto, { backgroundColor: e.color }]} />
          <Text style={[s.chipTexto, { color: e.color }]}>{e.texto}</Text>
        </View>
      ) : (
        <View style={[s.chip, { backgroundColor: '#eef2f7' }]}>
          <Text style={[s.chipTexto, { color: color.suave }]}>Pendiente</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={color.suave} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  miniatura: { width: 44, height: 44, borderRadius: 8, backgroundColor: color.fondo },
  icono: { alignItems: 'center', justifyContent: 'center' },
  nombre: { color: color.texto, fontWeight: '600' },
  sub: { color: color.suave, fontSize: 12, marginTop: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  punto: { width: 8, height: 8, borderRadius: 4 },
  chipTexto: { fontSize: 11, fontWeight: '700' },
});
