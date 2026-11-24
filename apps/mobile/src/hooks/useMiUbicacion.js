import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';

// Ubicación actual del trabajador mientras la pantalla está abierta
export function useMiUbicacion() {
  const enPantalla = useIsFocused();
  const [pos, setPos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enPantalla) return;
    let sub;
    let cancelado = false;
    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return setError('Sin permiso de ubicación');
      const actual = await Location.getLastKnownPositionAsync();
      if (actual && !cancelado) setPos({ lat: actual.coords.latitude, lng: actual.coords.longitude });
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
        (x) => !cancelado && setPos({ lat: x.coords.latitude, lng: x.coords.longitude }),
      );
    })().catch(() => setError('GPS no disponible'));
    return () => {
      cancelado = true;
      sub?.remove();
    };
  }, [enPantalla]);

  return { pos, error };
}
