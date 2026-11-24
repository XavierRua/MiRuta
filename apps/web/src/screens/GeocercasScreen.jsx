import { useState } from 'react';
import { FiPlus, FiCircle, FiHexagon } from 'react-icons/fi';
import Mapa from '../components/Mapa';
import { api } from '../services/api';
export default function GeocercasScreen() {
  const geocercas = api.getGeocercas();
  const eventosGeocerca = api.getEventosGeocerca();
  const [sel, setSel] = useState(geocercas[0].id);
  const g = geocercas.find((x) => x.id === sel);
  const centro = g.centro ?? g.puntos[0];
  return (
    <div className="pagina">
      <div className="geo-layout">
        <section className="panel">
          <div className="panel-cab">
            <h2>Geocercas</h2>
            <div className="botones">
              <button className="btn">
                <FiCircle /> Círculo
              </button>
              <button className="btn">
                <FiHexagon /> Polígono
              </button>
            </div>
          </div>
          <ul className="lista-geo">
            {geocercas.map((x) => (
              <li key={x.id} className={sel === x.id ? 'sel' : ''} onClick={() => setSel(x.id)}>
                <strong>{x.nombre}</strong>
                <span className={`chip ${x.tipo === 'zona_permitida' ? 'morado' : 'cian'}`}>
                  {x.tipo === 'zona_permitida' ? 'Zona permitida · alerta al salir' : 'Punto de visita'}
                </span>
                <small>
                  {x.forma === 'circulo' ? `Círculo de ${x.radio} m` : 'Polígono'} · Asignada a: {x.asignados}
                </small>
              </li>
            ))}
          </ul>
          <button className="btn primario ancho">
            <FiPlus /> Nueva geocerca
          </button>
        </section>

        <section className="panel mapa-panel">
          <Mapa key={sel} geocercas={geocercas} centro={centro} zoom={14} />
        </section>
      </div>

      <section className="panel">
        <div className="panel-cab">
          <h2>Entradas y salidas de hoy</h2>
          <button className="btn">Exportar a Excel</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Trabajador</th>
              <th>Geocerca</th>
              <th>Hora de entrada</th>
              <th>Hora de salida</th>
              <th>Permanencia</th>
            </tr>
          </thead>
          <tbody>
            {eventosGeocerca.map((e, i) => (
              <tr key={i}>
                <td>{e.trabajador}</td>
                <td>{e.geocerca}</td>
                <td>
                  <strong>{e.entrada}</strong>
                </td>
                <td>{e.salida ? <strong>{e.salida}</strong> : <span className="chip info">Dentro</span>}</td>
                <td>{e.permanencia}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
