// Ubicación GPS puntual (para el reporte). El rastreo continuo está en services/rastreo.js.
import * as Location from 'expo-location';

export async function obtenerUbicacion() {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) throw new Error('Necesitamos permiso de ubicación para registrar el reporte.');

  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const ubicacion = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    precisionM: Math.round(pos.coords.accuracy ?? 0),
    simulada: !!pos.mocked, // Android avisa si viene de una app de ubicación falsa
    capturadaEn: new Date(pos.timestamp),
    direccion: null,
  };

  // Dirección aproximada (usa el servicio del propio celular, sin costo)
  try {
    const [d] = await Location.reverseGeocodeAsync({ latitude: ubicacion.lat, longitude: ubicacion.lng });
    if (d)
      ubicacion.direccion = [d.street, d.streetNumber, d.district || d.subregion, d.city].filter(Boolean).join(' ');
  } catch {
    // sin dirección: no es grave, quedan las coordenadas
  }
  return ubicacion;
}
