import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '../theme/colors';
import { config } from '../config/app';
import { DOCS_VEHICULO } from '../config/documentos';
import TomarDocumento from '../components/TomarDocumento';
import { useDocumentos } from '../context/DocumentosContext';
import { useSesion } from '../context/SesionContext';

// Paso del registro: foto de SOAT, licencia, matrícula y técnico-mecánica (con su vencimiento)
export default function DocumentosRegistroScreen() {
  const { completarDocumentos } = useSesion();
  const { vehiculo, guardarDocumento, recargar } = useDocumentos();
  const [borrador, setBorrador] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    recargar();
  }, []);

  const valor = (id) => borrador[id] ?? vehiculo[id];
  const listos = DOCS_VEHICULO.filter((d) => valor(d.id)?.foto && (!d.vence || valor(d.id)?.vence)).length;

  const continuar = async () => {
    try {
      setGuardando(true);
      for (const d of DOCS_VEHICULO)
        if (borrador[d.id]) await guardarDocumento(d.id, borrador[d.id].foto, borrador[d.id].vence);
      await completarDocumentos();
    } catch (e) {
      Alert.alert('No se pudieron guardar', e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={s.fondo}>
      <ScrollView contentContainerStyle={s.contenido}>
        <Text style={s.titulo}>Documentos de tu vehículo</Text>
        <Text style={s.sub}>
          Toma una foto de cada documento con buena luz y que se lea todo. Quedan guardados en tu perfil y te avisaremos
          antes de que se venzan.
        </Text>

        {DOCS_VEHICULO.map((d) => (
          <TomarDocumento
            key={d.id}
            doc={d}
            valor={valor(d.id)}
            onCambiar={(v) => setBorrador((b) => ({ ...b, [d.id]: v }))}
          />
        ))}

        <Pressable
          style={[s.boton, listos < DOCS_VEHICULO.length && s.botonOff]}
          disabled={listos < DOCS_VEHICULO.length || guardando}
          onPress={continuar}
        >
          {guardando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.botonTexto}>
              {listos < DOCS_VEHICULO.length ? `Faltan ${DOCS_VEHICULO.length - listos} documentos` : 'Continuar'}
            </Text>
          )}
        </Pressable>
        {config.modoDemo && (
          <Pressable onPress={() => completarDocumentos(true)}>
            <Text style={s.demo}>Omitir por ahora (solo en la demo)</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 20, gap: 12 },
  titulo: { fontSize: 24, fontWeight: '800', color: color.texto },
  sub: { color: color.suave, lineHeight: 20, marginBottom: 4 },
  boton: { backgroundColor: color.primario, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 6 },
  botonOff: { opacity: 0.45 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  demo: { color: color.suave, textAlign: 'center', fontSize: 12, textDecorationLine: 'underline' },
});
