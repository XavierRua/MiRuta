// 42.6 → "42,6 km"
export function formatoKm(km) {
  return `${km.toFixed(1).replace('.', ',')} km`;
}
