import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSesion } from '../context/SesionContext';
import { color } from '../theme/colors';
import ActivacionScreen from '../screens/ActivacionScreen';
import CrearPinScreen from '../screens/CrearPinScreen';
import LoginScreen from '../screens/LoginScreen';
import BloqueadoScreen from '../screens/BloqueadoScreen';
import ConsentimientoScreen from '../screens/ConsentimientoScreen';
import PermisosScreen from '../screens/PermisosScreen';
import NuevoReporteScreen from '../screens/NuevoReporteScreen';
import ReportesDiaScreen from '../screens/ReportesDiaScreen';
import VisitaDetalleScreen from '../screens/VisitaDetalleScreen';
import UbicacionVisitaScreen from '../screens/UbicacionVisitaScreen';
import VisitasMapaScreen from '../screens/VisitasMapaScreen';
import DocumentosRegistroScreen from '../screens/DocumentosRegistroScreen';
import DocumentoScreen from '../screens/DocumentoScreen';
import TabsNavigator from './TabsNavigator';

const Stack = createNativeStackNavigator();

// Pantalla de cada paso del ingreso (ver SesionContext)
const pantallaPorPaso = {
  activar: ['Activacion', ActivacionScreen],
  crearPin: ['CrearPin', CrearPinScreen],
  pin: ['Login', LoginScreen],
  bloqueado: ['Bloqueado', BloqueadoScreen],
  consentimiento: ['Consentimiento', ConsentimientoScreen],
  permisos: ['Permisos', PermisosScreen],
  documentos: ['DocumentosRegistro', DocumentosRegistroScreen],
};

export default function AppNavigator() {
  const { paso } = useSesion();

  if (paso === 'cargando') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fondo }}>
        <ActivityIndicator size="large" color={color.primario} />
      </View>
    );
  }

  const [nombre, Pantalla] = pantallaPorPaso[paso] ?? [];

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {paso !== 'listo' ? (
        <Stack.Screen name={nombre} component={Pantalla} />
      ) : (
        <>
          <Stack.Screen name="Principal" component={TabsNavigator} />
          <Stack.Screen
            name="Autorizacion"
            component={ConsentimientoScreen}
            options={{ headerShown: true, title: 'Autorización de datos' }}
          />
          <Stack.Screen
            name="NuevoReporte"
            component={NuevoReporteScreen}
            options={{ headerShown: true, title: 'Reporte de actividad' }}
          />
          <Stack.Screen
            name="ReportesDia"
            component={ReportesDiaScreen}
            options={{ headerShown: true, title: 'Reportes del día' }}
          />
          <Stack.Screen
            name="VisitaDetalle"
            component={VisitaDetalleScreen}
            options={{ headerShown: true, title: 'Detalle de la visita' }}
          />
          <Stack.Screen
            name="UbicacionVisita"
            component={UbicacionVisitaScreen}
            options={{ headerShown: true, title: 'Ubicación de la visita' }}
          />
          <Stack.Screen
            name="VisitasMapa"
            component={VisitasMapaScreen}
            options={{ headerShown: true, title: 'Visitas de hoy en el mapa' }}
          />
          <Stack.Screen
            name="Documento"
            component={DocumentoScreen}
            options={{ headerShown: true, title: 'Documento' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
