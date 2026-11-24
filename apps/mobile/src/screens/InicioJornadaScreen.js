import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { api } from '../services/api';
import FormularioSalud from '../components/FormularioSalud';
import FormularioPreoperacional from '../components/FormularioPreoperacional';
import { useJornadaDia } from '../context/JornadaDiaContext';
import { useSesion } from '../context/SesionContext';

// Inicio de jornada obligatorio: 1) estado de salud, 2) preoperacional del vehículo.
// Hasta completar ambos no se ven las tareas ni las visitas del día.
// El GPS igual se activa a la hora de inicio del horario, aunque no los haya llenado.
export default function InicioJornadaScreen() {
  const { dia, guardarSalud, guardarPreoperacional, requiereSalud } = useJornadaDia();
  const { salir } = useSesion();
  const { preguntasSalud } = api.getFormularios();
  const [resultadoSalud, setResultadoSalud] = useState(null);
  const paso = requiereSalud && !dia.saludInicio ? 1 : 2;

  const enviarSalud = async (resp) => {
    try {
      const r = await guardarSalud('inicio', resp, preguntasSalud);
      setResultadoSalud(r);
    } catch (e) {
      Alert.alert('No se pudo enviar', e.message);
    }
  };
  const enviarPreop = async (datos) => {
    try {
      await guardarPreoperacional(datos);
    } catch (e) {
      Alert.alert('No se pudo enviar', e.message);
    }
  };

  return (
    <SafeAreaView style={s.fondo}>
      <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
        <Text style={s.titulo}>Antes de empezar tu jornada</Text>
        <View style={s.pasos}>
          {['Estado de salud', 'Preoperacional'].map((t, i) => {
            const hecho = i + 1 < paso;
            const actual = i + 1 === paso;
            return (
              <View key={t} style={[s.paso, actual && s.pasoActual, hecho && s.pasoHecho]}>
                <Ionicons
                  name={hecho ? 'checkmark-circle' : actual ? 'ellipse' : 'ellipse-outline'}
                  size={16}
                  color={hecho ? color.verde : actual ? color.primario : color.suave}
                />
                <Text style={[s.pasoTexto, (actual || hecho) && { color: color.texto }]}>
                  {i + 1}. {t}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={s.sub}>
          {paso === 1
            ? 'Cuéntanos cómo estás. Es obligatorio cada día antes de ver tus tareas y visitas.'
            : 'Revisa tu vehículo antes de salir.'}
        </Text>

        {(resultadoSalud ?? dia.saludInicio)?.alerta && (
          <View style={s.aviso}>
            <Ionicons name="call" size={18} color={color.rojo} />
            <Text style={s.avisoTexto}>
              Avisamos con sonido al administrador, a tu supervisor y a SST. Te contactarán para verificar la novedad.
              {(resultadoSalud ?? dia.saludInicio)?.noApto ? ' Si no estás en condiciones, no salgas a trabajar.' : ''}
            </Text>
          </View>
        )}

        {paso === 1 ? (
          <FormularioSalud preguntas={preguntasSalud} onEnviar={enviarSalud} textoBoton="Enviar y continuar" />
        ) : (
          <FormularioPreoperacional onEnviar={enviarPreop} />
        )}

        <Pressable onPress={salir}>
          <Text style={s.salir}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 20, gap: 12 },
  titulo: { fontSize: 24, fontWeight: '800', color: color.texto },
  pasos: { flexDirection: 'row', gap: 8 },
  paso: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e9edf3',
    borderRadius: 12,
    padding: 10,
  },
  pasoActual: { backgroundColor: color.primarioSuave },
  pasoHecho: { backgroundColor: color.verdeSuave },
  pasoTexto: { color: color.suave, fontWeight: '700', fontSize: 13 },
  sub: { color: color.suave, lineHeight: 20 },
  aviso: { flexDirection: 'row', gap: 8, backgroundColor: color.rojoSuave, borderRadius: 12, padding: 12 },
  avisoTexto: { flex: 1, color: color.rojo, fontWeight: '600', fontSize: 13 },
  salir: { color: color.suave, textAlign: 'center', textDecorationLine: 'underline', marginTop: 8 },
});
