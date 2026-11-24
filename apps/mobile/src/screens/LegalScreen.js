import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { color } from '../theme/colors';
import { LEGAL } from '../config/legal';

// Política de privacidad / Términos y condiciones (se abren desde el menú lateral)
export default function LegalScreen({ route }) {
  const doc = LEGAL[route?.params?.doc] ?? LEGAL.privacidad;
  return (
    <ScrollView style={s.fondo} contentContainerStyle={s.contenido}>
      <Text style={s.titulo}>{doc.titulo}</Text>
      <Text style={s.fecha}>Última actualización: {doc.actualizado}</Text>
      {doc.secciones.map(([t, texto]) => (
        <View key={t} style={s.seccion}>
          <Text style={s.subtitulo}>{t}</Text>
          <Text style={s.texto}>{texto}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 20, gap: 12 },
  titulo: { fontSize: 22, fontWeight: '800', color: color.texto },
  fecha: { color: color.suave, marginBottom: 4 },
  seccion: { backgroundColor: color.tarjeta, borderRadius: 14, padding: 16, gap: 6 },
  subtitulo: { fontWeight: '700', color: color.texto, fontSize: 15 },
  texto: { color: color.texto, lineHeight: 21 },
});
