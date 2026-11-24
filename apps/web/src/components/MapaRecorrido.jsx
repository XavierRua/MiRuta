import { MapContainer, TileLayer, Circle, Polygon, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { geocercaDe } from '../utils/visitas';
import { MODOS } from '../utils/desplazamiento';

// Geocerca de la visita, recorrido realizado y cada entrada (verde) y salida (rojo)
export default function MapaRecorrido({ visita, alto = 300 }) {
  const p = visita.programacion;
  const g = geocercaDe(p);
  const r = visita.recorrido;
  return (
    <div style={{ height: alto }}>
      <MapContainer center={[g.lat, g.lng]} zoom={16} className="mapa" style={{ minHeight: alto }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {p.tipo === 'obra' && (
          <Circle center={[g.lat, g.lng]} radius={p.radio} pathOptions={{ color: '#ea580c', fillOpacity: 0.12 }} />
        )}
        {p.tipo === 'zona' && <Polygon positions={p.area} pathOptions={{ color: '#7c3aed', fillOpacity: 0.12 }} />}
        {/* Recorrido con un color por modo (a pie / en vehículo) */}
        {(visita.tramos ?? [{ modo: 'vehiculo', puntos: r }])
          .filter((t) => t.puntos.length > 1)
          .map((t, i) => (
            <Polyline
              key={`t${i}`}
              positions={t.puntos}
              pathOptions={{ color: MODOS[t.modo].color, weight: 4, dashArray: MODOS[t.modo].guiones ?? undefined }}
            />
          ))}
        {visita.periodos.map((x, i) => {
          // la entrada es el primer punto del recorrido dentro de la geocerca en cada periodo
          const e = r[1 + i * 5] ?? r[1];
          return (
            <CircleMarker key={`e${i}`} center={e} radius={7} pathOptions={{ color: '#16a34a', fillOpacity: 1 }}>
              <Tooltip>
                Entrada {i + 1} · {x.entrada}
              </Tooltip>
            </CircleMarker>
          );
        })}
        {visita.periodos
          .filter((x) => x.salida)
          .map((x, i) => (
            <CircleMarker
              key={`s${i}`}
              center={r[4 + i * 5] ?? r[r.length - 1]}
              radius={7}
              pathOptions={{ color: '#dc2626', fillOpacity: 1 }}
            >
              <Tooltip>
                Salida {i + 1} · {x.salida}
              </Tooltip>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
}
