// Búsqueda de direcciones con Nominatim (OpenStreetMap), gratis.
// Política de uso: máximo 1 búsqueda por segundo y solo al escribir el administrador (nunca automática).
// https://operations.osmfoundation.org/policies/nominatim/
export async function buscarDireccion(texto) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=co&limit=5&accept-language=es&q=${encodeURIComponent(texto)}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('No se pudo buscar la dirección. Intenta de nuevo o marca el punto en el mapa.');
  const datos = await r.json();
  return datos.map((d) => ({ nombre: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
}

// Dirección de un punto marcado en el mapa (Nominatim inverso). Solo cuando el administrador hace clic.
export async function direccionDePunto(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=es&lat=${lat}&lon=${lng}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) return '';
  const d = await r.json();
  const a = d.address ?? {};
  const corta = [
    a.road && `${a.road}${a.house_number ? ` #${a.house_number}` : ''}`,
    a.suburb ?? a.neighbourhood,
    a.city ?? a.town,
  ]
    .filter(Boolean)
    .join(', ');
  return corta || d.display_name || '';
}
