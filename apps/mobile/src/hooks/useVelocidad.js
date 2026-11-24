import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { useExcesos } from '../context/ExcesosContext';
import { useVisitas } from '../context/VisitasContext';
import { INDICADORES } from '../config/indicadores';
import { ahoraServidor } from '../services/horaServidor';

// Resumen del día (se conserva aunque cambies de pestaña)
const hoy = { fecha: new Date().toDateString(), max: 0, km: 0, horasMovimiento: 0 };

function distanciaKm(a, b) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Velocidad actual en km/h con el GPS del celular, solo mientras la pantalla está visible.
// (El registro continuo para el administrador lo hace el rastreo en segundo plano.)
// Km medidos hoy con el GPS de la app (se usa para el km de las horas extras en la demo)
export function kmMedidoHoy() {
  return hoy.fecha === new Date().toDateString() ? hoy.km : 0;
}

export function useVelocidad(activo) {
  const [kmh, setKmh] = useState(null);
  const [error, setError] = useState(null);
  const [resumen, setResumen] = useState({ max: hoy.max, promedio: null });
  const [enPrimerPlano, setEnPrimerPlano] = useState(AppState.currentState === 'active');
  const anterior = useRef(null);
  const { registrarLectura } = useExcesos();
  const { procesarUbicacion } = useVisitas();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (e) => setEnPrimerPlano(e === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!activo || !enPrimerPlano) return;
    let suscripcion;
    let cancelado = false;

    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return setError('Sin permiso de ubicación');
      suscripcion = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 0 },
        (pos) => {
          if (cancelado) return;
          setError(null);
          if ((pos.coords.accuracy ?? 0) > 50) return; // punto poco preciso: se ignora
          // Llegada / salida de las visitas programadas (con la hora oficial)
          procesarUbicacion({ coords: pos.coords, hora: ahoraServidor() });

          if (hoy.fecha !== new Date().toDateString())
            Object.assign(hoy, { fecha: new Date().toDateString(), max: 0, km: 0, horasMovimiento: 0 });

          // Velocidad que da el GPS (m/s). Si no la da, se calcula con el punto anterior.
          let v = pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed * 3.6 : null;
          const prev = anterior.current;
          if (prev) {
            const km = distanciaKm(prev.coords, pos.coords);
            const horas = (pos.timestamp - prev.timestamp) / 3600000;
            if (horas > 0) {
              const calculada = km / horas;
              if (v == null) v = calculada;
              if (calculada >= 3 && calculada < 150) {
                hoy.km += km;
                hoy.horasMovimiento += horas;
              }
            }
          }
          anterior.current = pos;
          if (v == null) return;

          const redondeada = v < 3 ? 0 : Math.round(v); // por debajo de 3 km/h se considera detenido
          hoy.max = Math.max(hoy.max, redondeada);
          setKmh(redondeada);
          // Exceso de velocidad: se registra con hora oficial, ubicación y velocidad
          registrarLectura({
            kmh: redondeada,
            limite: INDICADORES.limiteVelocidad,
            coords: pos.coords,
            hora: ahoraServidor(),
          });
          setResumen({
            max: hoy.max,
            promedio: hoy.horasMovimiento > 0 ? Math.round(hoy.km / hoy.horasMovimiento) : null,
          });
        },
      );
    })().catch(() => setError('GPS no disponible'));

    return () => {
      cancelado = true;
      suscripcion?.remove();
      anterior.current = null;
    };
  }, [activo, enPrimerPlano, registrarLectura, procesarUbicacion]);

  return { kmh, error, resumen };
}
