// Estado de la batería del celular. Requiere: npx expo install expo-battery (funciona en Expo Go)
// Se guarda en cada ingreso, en cada reporte de actividad y al iniciar la jornada, como respaldo:
// si el trabajador dice "se me descargó el celular", queda el nivel que tenía en cada momento.
import * as Battery from 'expo-battery';

// { pct: 0–100, cargando: true/false, ahorro: modo de ahorro de energía } o null si no se puede leer
export async function leerBateria() {
  try {
    const [nivel, estado, ahorro] = await Promise.all([
      Battery.getBatteryLevelAsync(),
      Battery.getBatteryStateAsync(),
      Battery.isLowPowerModeEnabledAsync().catch(() => false),
    ]);
    if (nivel == null || nivel < 0) return null; // emulador o sin dato
    return {
      pct: Math.round(nivel * 100),
      cargando: estado === Battery.BatteryState.CHARGING || estado === Battery.BatteryState.FULL,
      ahorro: !!ahorro,
    };
  } catch {
    return null;
  }
}

// Avisa cada vez que cambia el nivel (para el aviso de batería baja). Devuelve la función para dejar de escuchar.
export function escucharBateria(alCambiar) {
  try {
    const sub = Battery.addBatteryLevelListener(() => leerBateria().then((b) => b && alCambiar(b)));
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

// "🔋 78 %" · "🔌 78 % (cargando)"
export const textoBateria = (b) =>
  b ? `${b.cargando ? '🔌' : '🔋'} ${b.pct} %${b.cargando ? ' (cargando)' : ''}` : '🔋 —';
