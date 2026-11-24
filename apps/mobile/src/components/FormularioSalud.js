import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';

// Reporte de estado de salud con las preguntas que configura el administrador.
// Devuelve las respuestas con onEnviar({ [id]: respuesta }).
export default function FormularioSalud({ preguntas, onEnviar, textoBoton = 'Enviar' }) {
  const [resp, setResp] = useState({});
  const [enviando, setEnviando] = useState(false);
  const faltan = preguntas.filter((p) => !p.opcional && !resp[p.id]);
  const alertas = preguntas.filter((p) => p.alertaSi && resp[p.id] === p.alertaSi);

  const enviar = async () => {
    setEnviando(true);
    try {
      await onEnviar(resp);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {preguntas.map((p) => (
        <View key={p.id} style={s.pregunta}>
          <Text style={s.texto}>{p.texto}</Text>
          {p.tipo === 'texto' ? (
            <TextInput
              style={s.input}
              multiline
              placeholder="Escribe aquí"
              value={resp[p.id] ?? ''}
              onChangeText={(t) => setResp({ ...resp, [p.id]: t })}
            />
          ) : (
            <View style={s.opciones}>
              {(p.tipo === 'si_no' ? ['Sí', 'No'] : p.opciones).map((o) => {
                const sel = resp[p.id] === o;
                const malo = sel && p.alertaSi === o;
                return (
                  <Pressable
                    key={o}
                    style={[s.opcion, sel && s.opcionSel, malo && s.opcionMala]}
                    onPress={() => setResp({ ...resp, [p.id]: o })}
                  >
                    <Text style={[s.opcionTexto, sel && { color: '#fff' }]}>{o}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ))}

      {alertas.length > 0 && (
        <View style={s.aviso}>
          <Ionicons name="alert-circle" size={18} color={color.rojo} />
          <Text style={s.avisoTexto}>
            Al enviar, se avisará con sonido al administrador, a tu supervisor y a SST. Ellos te contactarán para
            verificar la novedad.
          </Text>
        </View>
      )}

      <Pressable
        style={[s.boton, faltan.length > 0 && s.botonOff]}
        disabled={faltan.length > 0 || enviando}
        onPress={enviar}
      >
        {enviando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.botonTexto}>{faltan.length ? `Responde ${faltan.length} pregunta(s) más` : textoBoton}</Text>
        )}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  pregunta: { backgroundColor: color.tarjeta, borderRadius: 14, padding: 14, gap: 10 },
  texto: { fontWeight: '700', color: color.texto },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: { borderWidth: 1.5, borderColor: color.borde, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  opcionSel: { backgroundColor: color.verde, borderColor: color.verde },
  opcionMala: { backgroundColor: color.rojo, borderColor: color.rojo },
  opcionTexto: { fontWeight: '700', color: color.texto },
  input: {
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: 10,
    padding: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  aviso: { flexDirection: 'row', gap: 8, backgroundColor: color.rojoSuave, borderRadius: 12, padding: 12 },
  avisoTexto: { flex: 1, color: color.rojo, fontWeight: '600', fontSize: 13 },
  boton: { backgroundColor: color.primario, borderRadius: 14, padding: 16, alignItems: 'center' },
  botonOff: { opacity: 0.45 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
