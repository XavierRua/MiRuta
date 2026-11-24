import { useSesion } from '../context/SesionContext';
import MapaVivoScreen from '../screens/MapaVivoScreen';
import TrabajadoresScreen from '../screens/TrabajadoresScreen';
import VehiculosScreen from '../screens/VehiculosScreen';
import GeocercasScreen from '../screens/GeocercasScreen';
import HistorialScreen from '../screens/HistorialScreen';
import AlertasScreen from '../screens/AlertasScreen';
import ReportesScreen from '../screens/ReportesScreen';
import DesempenoScreen from '../screens/DesempenoScreen';
import NovedadesScreen from '../screens/NovedadesScreen';
import ProgramacionScreen from '../screens/ProgramacionScreen';
import HorasExtraScreen from '../screens/HorasExtraScreen';
import ConfiguracionScreen from '../screens/ConfiguracionScreen';
import HorariosScreen from '../screens/HorariosScreen';

const pantallas = {
  mapa: MapaVivoScreen,
  trabajadores: TrabajadoresScreen,
  vehiculos: VehiculosScreen,
  geocercas: GeocercasScreen,
  historial: HistorialScreen,
  alertas: AlertasScreen,
  reportes: ReportesScreen,
  desempeno: DesempenoScreen,
  programacion: ProgramacionScreen,
  novedades: NovedadesScreen,
  horasExtra: HorasExtraScreen,
  configuracion: ConfiguracionScreen,
  horarios: HorariosScreen,
};

// Muestra la pantalla que corresponde a la opción elegida en el menú
export default function AppNavigator() {
  const { pantalla } = useSesion();
  const Pantalla = pantallas[pantalla] ?? MapaVivoScreen;
  return <Pantalla />;
}
