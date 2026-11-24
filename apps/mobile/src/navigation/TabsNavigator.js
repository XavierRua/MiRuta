import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import JornadaScreen from '../screens/JornadaScreen';
import HistorialScreen from '../screens/HistorialScreen';
import PerfilScreen from '../screens/PerfilScreen';
import Encabezado from '../components/Encabezado';

const Tab = createBottomTabNavigator();

const iconos = { Jornada: 'navigate', Historial: 'time', Perfil: 'person' };

// Alto de la barra sin contar el espacio de los botones del sistema
const ALTO_BARRA = 58;

export default function TabsNavigator() {
  // insets.bottom = espacio que ocupan los botones del sistema (o la barra de gestos / el indicador del iPhone)
  const insets = useSafeAreaInsets();
  // Si el celular no reporta espacio (algunos Android con gestos), dejamos un margen mínimo
  const espacioInferior = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Encabezado igual en todas las pestañas: menú (☰), logo de la empresa y notificaciones
        headerShown: true,
        header: () => <Encabezado />,
        tabBarActiveTintColor: color.primario,
        tabBarInactiveTintColor: color.suave,
        tabBarStyle: {
          height: ALTO_BARRA + espacioInferior,
          paddingTop: 6,
          paddingBottom: espacioInferior,
          backgroundColor: color.tarjeta,
          borderTopColor: color.borde,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color: c, size }) => <Ionicons name={iconos[route.name]} size={size} color={c} />,
      })}
    >
      <Tab.Screen name="Jornada" component={JornadaScreen} />
      <Tab.Screen name="Historial" component={HistorialScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Mi perfil' }} />
    </Tab.Navigator>
  );
}
