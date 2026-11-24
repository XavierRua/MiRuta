import { useSesion } from './context/SesionContext';
import Sidebar from './components/Sidebar';
import AppNavigator from './navigation/AppNavigator';
import { menu } from './navigation/menu';
import LoginScreen from './screens/LoginScreen';

export default function App() {
  const { usuario, pantalla } = useSesion();

  if (!usuario) return <LoginScreen />;

  const titulo = menu.find((m) => m.id === pantalla)?.texto;

  return (
    <div className="app">
      <Sidebar />
      <main className="contenido">
        <header className="topbar">
          <h1>{titulo}</h1>
          <span className="demo">Datos de ejemplo</span>
        </header>
        <AppNavigator />
      </main>
    </div>
  );
}
