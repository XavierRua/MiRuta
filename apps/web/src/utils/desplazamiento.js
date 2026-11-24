// A pie, en vehículo o quieto: cómo se muestra en los mapas y tablas de la web
export const MODOS = {
  a_pie: { texto: 'A pie', emoji: '🚶', color: '#16a34a', guiones: '6 6' },
  vehiculo: { texto: 'En vehículo', emoji: '🏍️', color: '#2563eb', guiones: null },
  quieto: { texto: 'Quieto', emoji: '⏸️', color: '#64748b', guiones: null },
};

// Moto o carro según el vehículo asignado
export const emojiVehiculo = (tipo) => (/moto/i.test(tipo ?? '') ? '🏍️' : '🚗');

export function infoModo(modo, tipoVehiculo) {
  const m = MODOS[modo];
  if (!m) return null;
  return modo === 'vehiculo' ? { ...m, emoji: emojiVehiculo(tipoVehiculo) } : m;
}

export function textoMin(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  return h ? `${h} h ${String(Math.round(min % 60)).padStart(2, '0')} min` : `${Math.round(min)} min`;
}
export const kmTexto = (km) => `${String(Math.round((km ?? 0) * 10) / 10).replace('.', ',')} km`;
