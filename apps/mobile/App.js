import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SesionProvider } from './src/context/SesionContext';
import { DocumentosProvider } from './src/context/DocumentosContext';
import { PermisosProvider } from './src/context/PermisosContext';
import { ReportesProvider } from './src/context/ReportesContext';
import { ExcesosProvider } from './src/context/ExcesosContext';
import { HorasExtraProvider } from './src/context/HorasExtraContext';
import { VisitasProvider } from './src/context/VisitasContext';
import { DesplazamientoProvider } from './src/context/DesplazamientoContext';
import { JornadaDiaProvider } from './src/context/JornadaDiaContext';
import { NotificacionesProvider } from './src/context/NotificacionesContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    // initialWindowMetrics: las medidas del área segura están disponibles desde el primer instante,
    // así la barra de pestañas no "salta" ni aparece debajo de los botones del sistema al abrir la app
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <PermisosProvider>
        <DocumentosProvider>
          <SesionProvider>
            <JornadaDiaProvider>
              <ReportesProvider>
                <ExcesosProvider>
                  <HorasExtraProvider>
                    <DesplazamientoProvider>
                      <VisitasProvider>
                        <NotificacionesProvider>
                          <NavigationContainer>
                            <StatusBar style="dark" />
                            <AppNavigator />
                          </NavigationContainer>
                        </NotificacionesProvider>
                      </VisitasProvider>
                    </DesplazamientoProvider>
                  </HorasExtraProvider>
                </ExcesosProvider>
              </ReportesProvider>
            </JornadaDiaProvider>
          </SesionProvider>
        </DocumentosProvider>
      </PermisosProvider>
    </SafeAreaProvider>
  );
}
