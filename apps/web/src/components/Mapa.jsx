import { MapContainer, TileLayer, Marker, Circle, Polygon, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { colorEstado } from '../constants/estados';
// Marcador con la foto del trabajador (o sus iniciales) y un borde del color de su estado
function iconoTrabajador(t, seleccionado) {
  const tam = seleccionado ? 54 : 44;
  const contenido = t.foto ? `<img src="${t.foto}" alt="" />` : `<span>${t.nombres[0]}${t.apellidos[0]}</span>`;
  return L.divIcon({
    className: '',
    html: `<div class="marcador ${seleccionado ? 'sel' : ''}" style="--color:${colorEstado[t.estado]};width:${tam}px;height:${tam}px">${contenido}<i></i></div>`,
    iconSize: [tam, tam + 8],
    iconAnchor: [tam / 2, tam + 8],
    tooltipAnchor: [0, -tam - 6],
  });
}
export default function Mapa({
  trabajadores = [],
  geocercas = [],
  recorrido,
  seleccionado,
  onSeleccionar,
  centro = [6.2476, -75.573],
  zoom = 13,
}) {
  return (
    <MapContainer center={centro} zoom={zoom} className="mapa" scrollWheelZoom>
      {/* Mapas de OpenStreetMap: válidos para desarrollo. En producción usar Protomaps propio. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {geocercas.map((g) => {
        const estilo = {
          color: g.tipo === 'zona_permitida' ? '#7c3aed' : '#0891b2',
          weight: 2,
          fillOpacity: 0.12,
          dashArray: g.tipo === 'zona_permitida' ? '6 4' : undefined,
        };
        return g.forma === 'circulo' && g.centro ? (
          <Circle key={g.id} center={g.centro} radius={g.radio ?? 100} pathOptions={estilo}>
            <Tooltip>{g.nombre}</Tooltip>
          </Circle>
        ) : (
          <Polygon key={g.id} positions={g.puntos ?? []} pathOptions={estilo}>
            <Tooltip>{g.nombre}</Tooltip>
          </Polygon>
        );
      })}

      {recorrido && <Polyline positions={recorrido} pathOptions={{ color: '#ea580c', weight: 4 }} />}

      {trabajadores.map((t) => (
        <Marker
          key={t.id}
          position={[t.lat, t.lng]}
          icon={iconoTrabajador(t, seleccionado === t.id)}
          zIndexOffset={seleccionado === t.id ? 1000 : 0}
          eventHandlers={{ click: () => onSeleccionar?.(t.id) }}
        >
          <Tooltip direction="top">
            <strong>
              {t.nombres} {t.apellidos}
            </strong>
            <br />
            {t.vehiculoPlaca ?? 'Sin vehículo'} · {t.velocidad} km/h · {t.bateria} %
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
