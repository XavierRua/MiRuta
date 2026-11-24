import { MODOS, emojiVehiculo } from '../utils/desplazamiento';

// Leyenda del mapa: íconos del trabajador y colores de la línea del recorrido
export default function LeyendaDesplazamiento({ flotante = false }) {
  return (
    <div className={`leyenda-desp ${flotante ? 'flotante' : ''}`}>
      <span>
        {MODOS.a_pie.emoji} A pie <i className="linea a-pie" />
      </span>
      <span>
        {emojiVehiculo('Moto')} / {emojiVehiculo('Carro')} En vehículo <i className="linea vehiculo" />
      </span>
      <span>{MODOS.quieto.emoji} Quieto</span>
    </div>
  );
}
