import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { color } from '../theme/colors';
import { api } from '../services/api';
import FormularioSalud from '../components/FormularioSalud';
import { useJornadaDia } from '../context/JornadaDiaContext';

// Reporte de estado de salud al terminar la jornada (mismas preguntas que al iniciar)
export default function SaludSalidaScreen({ navigation }) {
  const { guardarSalud } = useJornadaDia();
  const { preguntasSalud } = api.getFormularios();
  const enviar = async (resp) => {
    try {
      const r = await guardarSalud('fin', resp, preguntasSalud);
      Alert.alert(
        'Reporte enviado',
        r.alerta ? 'Avisamos a tu supervisor, a SST y al administrador.' : 'Gracias. ¡Buen descanso!',
        [{ text: 'Listo', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('No se pudo enviar', e.message);
    }
  };
  return (
    <ScrollView style={s.fondo} contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
      <Text style={s.sub}>¿Cómo terminas tu jornada? Si tuviste algún malestar o lesión, cuéntanos.</Text>
      <FormularioSalud preguntas={preguntasSalud} onEnviar={enviar} textoBoton="Enviar reporte de salida" />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 20, gap: 12 },
  sub: { color: color.suave, lineHeight: 20 },
});
