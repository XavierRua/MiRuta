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
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    // initialWindowMetrics: las medidas del área segura están disponibles desde el primer instante,
    // así la barra de pestañas no "salta" ni aparece debajo de los botones del sistema al abrir la app
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <PermisosProvider>
        <DocumentosProvider>
          <SesionProvider>
            <ReportesProvider>
              <ExcesosProvider>
                <HorasExtraProvider>
                  <VisitasProvider>
                    <NavigationContainer>
                      <StatusBar style="dark" />
                      <AppNavigator />
                    </NavigationContainer>
                  </VisitasProvider>
                </HorasExtraProvider>
              </ExcesosProvider>
            </ReportesProvider>
          </SesionProvider>
        </DocumentosProvider>
      </PermisosProvider>
    </SafeAreaProvider>
  );
}
