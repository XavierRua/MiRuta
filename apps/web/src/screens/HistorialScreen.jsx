import { useMemo, useState } from 'react';
import { FiDownload, FiAlertTriangle } from 'react-icons/fi';
import Mapa from '../components/Mapa';
import ChipEficiencia from '../components/ChipEficiencia';
import FiltroPeriodo, { periodoInicial } from '../components/FiltroPeriodo';
import { useConfig } from '../context/ConfigContext';
import { useProgramacion } from '../context/ProgramacionContext';
import { generarVisitas } from '../utils/visitas';
import { useEmpresa } from '../hooks/useEmpresa';
import { api } from '../services/api';
import { aTextoFecha, deTextoFecha, validarRango } from '../utils/fechas';

const fechaCorta = (d) => d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });

// Historial e indicadores de UN trabajador: km, velocidades, excesos y eficiencia por jornada
export default function HistorialScreen() {
  const { empresaId, trabajadores: lista } = useEmpresa();
  const { indicadores } = useConfig();
  const [trab, setTrab] = useState(lista[0]?.id);
  const [filtro, setFiltro] = useState(periodoInicial('Semana'));
  const [diaMapa, setDiaMapa] = useState(null);
  const t = lista.find((x) => x.id === trab) ?? lista[0];
  const error = validarRango(filtro.desde, filtro.hasta);

  const dias = useMemo(
    () =>
      error || !t
        ? []
        : api.getIndicadoresDiarios({
            empresaId,
            trabajadorId: t.id,
            desde: deTextoFecha(filtro.desde),
            hasta: deTextoFecha(filtro.hasta),
            limiteVelocidad: indicadores.limiteVelocidad,
          }),
    [empresaId, t?.id, filtro, error, indicadores.limiteVelocidad],
  );
  const total = api.resumirIndicadores(dias)[0];
  // Visitas programadas por el administrador: cumplidas / programadas de cada día
  const { programaciones } = useProgramacion();
  const visitasPorDia = useMemo(() => {
    const m = new Map();
    if (error || !t) return m;
    generarVisitas(programaciones, [t.id], deTextoFecha(filtro.desde), deTextoFecha(filtro.hasta)).forEach((v) => {
      const k = aTextoFecha(v.fecha);
      const c = m.get(k) ?? { total: 0, cumplidas: 0 };
      c.total += 1;
      if (v.estado === 'cumplida') c.cumplidas += 1;
      m.set(k, c);
    });
    return m;
  }, [programaciones, t?.id, filtro, error]);
  const horasExtraTotal = dias.reduce((t, d) => t + (d.horasExtra?.horas ?? 0), 0);
  const excesos = dias.flatMap((d) => d.excesos.map((e) => ({ ...e, fecha: d.fecha })));

  return (
    <div className="pagina">
      <div className="barra">
        <select value={t?.id} onChange={(e) => setTrab(e.target.value)}>
          {lista.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nombres} {x.apellidos}
            </option>
          ))}
        </select>
        <FiltroPeriodo valor={filtro} onCambiar={setFiltro} error={error} />
        <button className="btn">
          <FiDownload /> Excel
        </button>
      </div>

      {error ? (
        <div className="aviso error">{error}</div>
      ) : (
        <>
          <div className="kpis kpis-5">
            <div className="kpi">
              <span>Kilómetros</span>
              <strong>{total ? total.km.toLocaleString('es-CO') : 0} km</strong>
              <small>
                {total?.jornadas ?? 0} jornadas
                {horasExtraTotal > 0 && (
                  <span className="texto-morado">
                    {' '}
                    · {String(Math.round(horasExtraTotal * 10) / 10).replace('.', ',')} h extras
                  </span>
                )}
              </small>
            </div>
            <div className="kpi">
              <span>Velocidad promedio</span>
              <strong>{total?.velPromedio ?? 0} km/h</strong>
              <small>en movimiento</small>
            </div>
            <div className="kpi">
              <span>Velocidad máxima</span>
              <strong className={total?.velMax > indicadores.limiteVelocidad ? 'texto-danger' : ''}>
                {total?.velMax ?? 0} km/h
              </strong>
              <small>límite {indicadores.limiteVelocidad} km/h</small>
            </div>
            <div className="kpi">
              <span>Excesos de velocidad</span>
              <strong className={excesos.length ? 'texto-danger' : ''}>{excesos.length}</strong>
              <small>registrados</small>
            </div>
            <div className="kpi">
              <span>Eficiencia de reportes</span>
              <ChipEficiencia pct={total?.eficiencia ?? null} grande />
              <small>
                {total?.enviados ?? 0} de {total?.esperados ?? 0} a tiempo
              </small>
            </div>
          </div>

          <div className="hist-layout">
            <section className="panel">
              <h2>Jornadas</h2>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Km</th>
                    <th>Vel. prom.</th>
                    <th>Vel. máx.</th>
                    <th>Excesos</th>
                    <th>Reportes</th>
                    <th>Eficiencia</th>
                    <th>Visitas</th>
                    <th>Horas extras</th>
                  </tr>
                </thead>
                <tbody>
                  {dias.map((d) => (
                    <tr
                      key={d.fecha.toISOString()}
                      className={diaMapa === d ? 'fila-sel' : ''}
                      onClick={() => setDiaMapa(d)}
                    >
                      <td>
                        <strong>{fechaCorta(d.fecha)}</strong>
                      </td>
                      <td>{d.km.toFixed(1)}</td>
                      <td>{d.velPromedio} km/h</td>
                      <td className={d.velMax > indicadores.limiteVelocidad ? 'texto-danger' : ''}>{d.velMax} km/h</td>
                      <td>{d.excesos.length ? <span className="chip danger">{d.excesos.length}</span> : '—'}</td>
                      <td>
                        {d.enviados}/{d.esperados}
                      </td>
                      <td>
                        <ChipEficiencia pct={d.eficiencia} />
                      </td>
                      <td>
                        {(() => {
                          const v = visitasPorDia.get(aTextoFecha(d.fecha));
                          return v ? (
                            <span className={`chip ${v.cumplidas === v.total ? 'ok' : 'naranja'}`}>
                              {v.cumplidas}/{v.total}
                            </span>
                          ) : (
                            '—'
                          );
                        })()}
                      </td>
                      <td>
                        {d.horasExtra ? (
                          <span
                            className="chip morado"
                            title={`${d.horasExtra.km} km · reportes ${d.horasExtra.enviados}/${d.horasExtra.esperados}`}
                          >
                            {String(d.horasExtra.horas).replace('.', ',')} h{!d.horasExtra.fin && ' · en curso'}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                  {dias.length === 0 && (
                    <tr>
                      <td colSpan={9} className="vacio">
                        No hay jornadas en este periodo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="panel">
              <h2>
                <FiAlertTriangle /> Excesos de velocidad ({excesos.length})
              </h2>
              {excesos.length === 0 ? (
                <p className="nota">Sin excesos en este periodo.</p>
              ) : (
                <ul className="lista-excesos">
                  {excesos.map((e, i) => (
                    <li key={i}>
                      <span className="vel">{e.velocidad} km/h</span>
                      <div>
                        <strong>
                          {fechaCorta(e.fecha)} · {e.hora}
                        </strong>
                        <small className="bloque">
                          {e.via} ·{' '}
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lng}#map=17/${e.lat}/${e.lng}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {e.lat.toFixed(5)}, {e.lng.toFixed(5)}
                          </a>
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mapa-mini">
                <Mapa recorrido={api.getRecorrido()} geocercas={api.getGeocercas()} centro={[t.lat, t.lng]} zoom={13} />
              </div>
              <small className="nota">
                Recorrido de ejemplo. Con el GPS real se verá el recorrido de la jornada elegida.
              </small>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
