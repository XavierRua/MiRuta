import { MapContainer, TileLayer, Marker, Circle, Polygon, Polyline, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Marcador numerado (para el orden de la ruta)
const icono = (n, color = '#ea580c') =>
  L.divIcon({
    className: '',
    html: `<div class="pin-num" style="--c:${color}">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

function Clics({ onClic }) {
  useMapEvents({ click: (e) => onClic?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Mapa para programar: muestra puntos, radio o área y avisa dónde hace clic el administrador
// Los pines y las esquinas del área se pueden arrastrar para ajustar la ubicación y la geocerca.
export default function MapaSelector({
  tipo,
  puntos = [],
  radio = 0,
  area = [],
  onClic,
  onMoverPunto,
  onMoverVertice,
  centro,
  alto = 360,
}) {
  const arrastre = (fn, i) => ({
    dragend: (e) => {
      const { lat, lng } = e.target.getLatLng();
      fn?.(i, lat, lng);
    },
  });
  const c = centro ?? (puntos[0] ? [puntos[0].lat, puntos[0].lng] : (area[0] ?? [6.2476, -75.573]));
  return (
    <div style={{ height: alto }}>
      <MapContainer key={c.join(',')} center={c} zoom={14} className="mapa mapa-selector" style={{ minHeight: alto }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Clics onClic={onClic} />
        {tipo === 'ruta' && puntos.length > 1 && (
          <Polyline
            positions={puntos.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: '#2563eb', weight: 4, dashArray: '8 6' }}
          />
        )}
        {puntos.map((p, i) => (
          <Marker
            key={i}
            position={[p.lat, p.lng]}
            draggable
            eventHandlers={arrastre(onMoverPunto, i)}
            icon={icono(
              tipo === 'ruta' ? i + 1 : '★',
              tipo === 'ruta' ? '#2563eb' : tipo === 'zona' ? '#7c3aed' : '#ea580c',
            )}
          >
            <Tooltip>{`${p.nombre || `Punto ${i + 1}`} (arrastra para mover)`}</Tooltip>
          </Marker>
        ))}
        {tipo === 'obra' && puntos[0] && radio > 0 && (
          <Circle
            center={[puntos[0].lat, puntos[0].lng]}
            radius={radio}
            pathOptions={{ color: '#ea580c', fillOpacity: 0.12 }}
          />
        )}
        {tipo === 'zona' &&
          area.length > 0 &&
          (area.length >= 3 ? (
            <Polygon positions={area} pathOptions={{ color: '#7c3aed', fillOpacity: 0.15 }} />
          ) : (
            <Polyline positions={area} pathOptions={{ color: '#7c3aed' }} />
          ))}
        {tipo === 'ruta' &&
          radio > 0 &&
          puntos.map((p, i) => (
            <Circle
              key={`r${i}`}
              center={[p.lat, p.lng]}
              radius={radio}
              pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: 0.08 }}
            />
          ))}
        {tipo === 'zona' &&
          area.map((v, i) => (
            <Marker
              key={`v${i}`}
              position={v}
              draggable
              eventHandlers={arrastre(onMoverVertice, i)}
              icon={icono(i + 1, '#7c3aed')}
            />
          ))}
      </MapContainer>
    </div>
  );
}
