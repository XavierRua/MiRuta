import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { config } from '../config/app';
import { SEGURIDAD } from '../config/seguridad';
import { useSesion } from '../context/SesionContext';

// Primera vez en este celular: el trabajador lo vincula a su cuenta con el código que le da el administrador
export default function ActivacionScreen() {
  const { activar } = useSesion();
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [cedula, setCedula] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const completo = codigoEmpresa.trim() && cedula.trim() && codigo.length === SEGURIDAD.largoCodigoActivacion;

  const vincular = async () => {
    setError(null);
    setEnviando(true);
    try {
      await activar({ codigoEmpresa, cedula, codigo });
    } catch (e) {
      setError(e);
    } finally {
      setEnviando(false);
    }
  };

  const llenarDemo = (ced, cod) => {
    setCodigoEmpresa('ANDINA');
    setCedula(ced);
    setCodigo(cod);
    setError(null);
  };

  return (
    <SafeAreaView style={s.fondo}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
          <Text style={s.logo}>
            <Text style={{ color: color.primario }}>◉</Text> MiRuta
          </Text>
          <Text style={s.titulo}>Activa tu celular</Text>
          <Text style={s.sub}>
            Tu cuenta quedará vinculada a este celular. Pide el código de activación a tu administrador.
          </Text>

          <View style={s.tarjeta}>
            <Text style={s.label}>Código de empresa</Text>
            <TextInput
              style={s.input}
              value={codigoEmpresa}
              onChangeText={setCodigoEmpresa}
              autoCapitalize="characters"
              placeholder="Ej.: ANDINA"
            />
            <Text style={s.label}>Cédula</Text>
            <TextInput
              style={s.input}
              value={cedula}
              onChangeText={setCedula}
              keyboardType="number-pad"
              placeholder="Sin puntos"
            />
            <Text style={s.label}>Código de activación</Text>
            <TextInput
              style={[s.input, s.codigo]}
              value={codigo}
              onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, SEGURIDAD.largoCodigoActivacion))}
              keyboardType="number-pad"
              placeholder="000000"
              maxLength={SEGURIDAD.largoCodigoActivacion}
            />

            {error && (
              <View style={[s.error, error.tipo === 'otro_celular' && s.errorFuerte]}>
                <Ionicons
                  name={error.tipo === 'otro_celular' ? 'phone-portrait' : 'alert-circle'}
                  size={18}
                  color={color.rojo}
                />
                <Text style={s.errorTexto}>{error.message}</Text>
              </View>
            )}

            <Pressable
              style={[s.boton, (!completo || enviando) && s.botonOff]}
              disabled={!completo || enviando}
              onPress={vincular}
            >
              {enviando ? <ActivityIndicator color="#fff" /> : <Text style={s.botonTexto}>Vincular este celular</Text>}
            </Pressable>
          </View>

          {config.modoDemo && (
            <View style={s.demo}>
              <Text style={s.demoTitulo}>Para probar (datos de ejemplo)</Text>
              <Pressable onPress={() => llenarDemo('1036458221', '482913')}>
                <Text style={s.demoEnlace}>• Carlos: celular libre → se vincula</Text>
              </Pressable>
              <Pressable onPress={() => llenarDemo('98765432', '715204')}>
                <Text style={s.demoEnlace}>• Diego: ya tiene otro celular → se rechaza y se avisa</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 24, paddingTop: 40, gap: 6 },
  logo: { fontSize: 32, fontWeight: '800', textAlign: 'center', color: color.texto },
  titulo: { fontSize: 22, fontWeight: '800', color: color.texto, textAlign: 'center', marginTop: 12 },
  sub: { textAlign: 'center', color: color.suave, marginBottom: 16, lineHeight: 20 },
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: 18, padding: 20, gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: color.texto, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  codigo: { fontSize: 22, letterSpacing: 8, textAlign: 'center', fontWeight: '700' },
  error: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: color.rojoSuave,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  errorFuerte: { borderWidth: 1, borderColor: color.rojo },
  errorTexto: { flex: 1, color: color.rojo, lineHeight: 19 },
  boton: {
    backgroundColor: color.primario,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  botonOff: { opacity: 0.45 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  demo: { marginTop: 18, backgroundColor: color.ambarSuave, borderRadius: 12, padding: 12, gap: 6 },
  demoTitulo: { fontWeight: '700', color: color.ambar },
  demoEnlace: { color: color.ambar, textDecorationLine: 'underline' },
});
