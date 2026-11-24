import { useState } from 'react';
import { alertaInfo as info } from '../constants/alertas';
import { api } from '../services/api';
import { useConfig } from '../context/ConfigContext';
const filtros = ['Todas', 'Abiertas', 'Vistas', 'Cerradas'];
export default function AlertasScreen() {
  const { indicadores } = useConfig();
  const alertas = api.getAlertas(indicadores.limiteVelocidad);
  const [filtro, setFiltro] = useState('Abiertas');
  const mapa = { Todas: null, Abiertas: 'abierta', Vistas: 'vista', Cerradas: 'cerrada' };
  const lista = alertas.filter((a) => !mapa[filtro] || a.estado === mapa[filtro]);
  return (
    <div className="pagina">
      <div className="barra">
        <div className="segmentos">
          {filtros.map((f) => (
            <button key={f} className={f === filtro ? 'activo' : ''} onClick={() => setFiltro(f)}>
              {f}
            </button>
          ))}
        </div>
        <select>
          <option>Todos los tipos</option>
          {Object.values(info).map((i) => (
            <option key={i.texto}>{i.texto}</option>
          ))}
        </select>
      </div>

      <section className="panel">
        <ul className="lista-alertas">
          {lista.map((a) => (
            <li key={a.id}>
              <span className={`alerta-icono ${info[a.tipo].clase}`}>{info[a.tipo].icono}</span>
              <div className="datos">
                <strong>
                  {info[a.tipo].texto} · {a.trabajador}
                </strong>
                <small>{a.mensaje}</small>
              </div>
              <span className="hora">{a.hora}</span>
              <span className={`chip ${a.estado === 'abierta' ? 'danger' : a.estado === 'vista' ? 'info' : 'muted'}`}>
                {a.estado}
              </span>
              {a.estado !== 'cerrada' && <button className="btn peq">Atender</button>}
            </li>
          ))}
          {lista.length === 0 && <li className="vacio">No hay alertas en este filtro.</li>}
        </ul>
      </section>
      <small className="nota">
        "Apagado por la persona" es una inferencia: se basa en el aviso de apagado de Android y el nivel de batería.
      </small>
    </div>
  );
}
