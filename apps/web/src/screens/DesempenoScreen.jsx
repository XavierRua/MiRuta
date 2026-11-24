import { useMemo, useState } from 'react';
import { FiDownload, FiExternalLink } from 'react-icons/fi';
import Avatar from '../components/Avatar';
import ChipEficiencia from '../components/ChipEficiencia';
import FiltroPeriodo, { periodoInicial } from '../components/FiltroPeriodo';
import { useConfig } from '../context/ConfigContext';
import { useEmpresa } from '../hooks/useEmpresa';
import { api } from '../services/api';
import { nivelEficiencia, porcentaje } from '../utils/eficiencia';
import { deTextoFecha, validarRango } from '../utils/fechas';

const columnas = [
  { id: 'nombre', texto: 'Trabajador' },
  { id: 'jornadas', texto: 'Jornadas' },
  { id: 'km', texto: 'Km' },
  { id: 'velPromedio', texto: 'Vel. prom.' },
  { id: 'velMax', texto: 'Vel. máx.' },
  { id: 'excesos', texto: 'Excesos' },
  { id: 'eficiencia', texto: 'Eficiencia de reportes' },
];

// Resumen comparativo de todos los trabajadores y registro de excesos de velocidad
export default function DesempenoScreen() {
  const { empresaId, trabajadores } = useEmpresa();
  const { indicadores } = useConfig();
  const [filtro, setFiltro] = useState(periodoInicial('Mes'));
  const [vista, setVista] = useState('comparativo');
  const [orden, setOrden] = useState({ col: 'eficiencia', asc: false });
  const error = validarRango(filtro.desde, filtro.hasta);

  const dias = useMemo(
    () =>
      error
        ? []
        : api.getIndicadoresDiarios({
            empresaId,
            desde: deTextoFecha(filtro.desde),
            hasta: deTextoFecha(filtro.hasta),
            limiteVelocidad: indicadores.limiteVelocidad,
          }),
    [empresaId, filtro, error, indicadores.limiteVelocidad],
  );
  const persona = (id) => trabajadores.find((t) => t.id === id);

  const filas = api
    .resumirIndicadores(dias)
    .map((r) => ({ ...r, nombre: `${persona(r.trabajadorId).nombres} ${persona(r.trabajadorId).apellidos}` }))
    .sort((a, b) => {
      const va = a[orden.col] ?? -1;
      const vb = b[orden.col] ?? -1;
      const c = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return orden.asc ? c : -c;
    });

  const excesos = dias
    .flatMap((d) => d.excesos.map((e) => ({ ...e, fecha: d.fecha, trabajadorId: d.trabajadorId })))
    .sort((a, b) => b.fecha - a.fecha || b.hora.localeCompare(a.hora));

  const totalKm = filas.reduce((s, r) => s + r.km, 0);
  const totalEsperados = filas.reduce((s, r) => s + r.esperados, 0);
  const totalEnviados = filas.reduce((s, r) => s + r.enviados, 0);
  const enRojo = filas.filter((r) => nivelEficiencia(r.eficiencia, indicadores).clase === 'danger').length;
  const maxKm = Math.max(1, ...filas.map((r) => r.km));

  const ordenarPor = (col) => setOrden((o) => ({ col, asc: o.col === col ? !o.asc : col === 'nombre' }));

  return (
    <div className="pagina">
      <div className="barra">
        <div className="segmentos">
          <button className={vista === 'comparativo' ? 'activo' : ''} onClick={() => setVista('comparativo')}>
            Comparativo
          </button>
          <button className={vista === 'excesos' ? 'activo' : ''} onClick={() => setVista('excesos')}>
            Excesos de velocidad ({excesos.length})
          </button>
        </div>
        <FiltroPeriodo valor={filtro} onCambiar={setFiltro} error={error} />
        <button className="btn">
          <FiDownload /> Excel
        </button>
      </div>

      {error ? (
        <div className="aviso error">{error}</div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <span>Km de todos</span>
              <strong>{Math.round(totalKm).toLocaleString('es-CO')} km</strong>
              <small>{filas.length} trabajadores</small>
            </div>
            <div className="kpi">
              <span>Eficiencia de la empresa</span>
              <ChipEficiencia pct={porcentaje(totalEnviados, totalEsperados)} grande />
              <small>
                {totalEnviados} de {totalEsperados} reportes a tiempo
              </small>
            </div>
            <div className="kpi">
              <span>Excesos de velocidad</span>
              <strong className={excesos.length ? 'texto-danger' : ''}>{excesos.length}</strong>
              <small>límite {indicadores.limiteVelocidad} km/h</small>
            </div>
            <div className="kpi">
              <span>Trabajadores en rojo</span>
              <strong className={enRojo ? 'texto-danger' : ''}>{enRojo}</strong>
              <small>eficiencia menor a {indicadores.eficienciaNaranja} %</small>
            </div>
          </div>

          {vista === 'comparativo' ? (
            <section className="panel">
              <table className="ordenable">
                <thead>
                  <tr>
                    {columnas.map((c) => (
                      <th key={c.id} onClick={() => ordenarPor(c.id)}>
                        {c.texto} {orden.col === c.id ? (orden.asc ? '▲' : '▼') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((r) => {
                    const t = persona(r.trabajadorId);
                    const n = nivelEficiencia(r.eficiencia, indicadores);
                    return (
                      <tr key={r.trabajadorId}>
                        <td>
                          <div className="celda-persona">
                            <Avatar nombres={t.nombres} apellidos={t.apellidos} foto={t.foto} tam={32} />
                            <span>{r.nombre}</span>
                          </div>
                        </td>
                        <td>{r.jornadas}</td>
                        <td>
                          <div className="barra-km">
                            <span style={{ width: `${(r.km / maxKm) * 100}%` }} />
                            <em>{r.km.toLocaleString('es-CO')}</em>
                          </div>
                        </td>
                        <td>{r.velPromedio} km/h</td>
                        <td className={r.velMax > indicadores.limiteVelocidad ? 'texto-danger' : ''}>
                          {r.velMax} km/h
                        </td>
                        <td>{r.excesos ? <span className="chip danger">{r.excesos}</span> : '—'}</td>
                        <td>
                          <div className="eficiencia">
                            <div className={`barra-ef ${n.clase}`}>
                              <span style={{ width: `${r.eficiencia ?? 0}%` }} />
                            </div>
                            <ChipEficiencia pct={r.eficiencia} />
                            <small>
                              {r.enviados}/{r.esperados}
                            </small>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <small className="nota">
                Eficiencia = reportes enviados a tiempo ÷ reportes esperados. Verde ≥ {indicadores.eficienciaVerde} %,
                naranja ≥ {indicadores.eficienciaNaranja} %, rojo por debajo. Cámbialo en Configuración.
              </small>
            </section>
          ) : (
            <section className="panel">
              <table>
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Trabajador</th>
                    <th>Velocidad</th>
                    <th>Sobre el límite</th>
                    <th>Vía</th>
                    <th>Ubicación</th>
                  </tr>
                </thead>
                <tbody>
                  {excesos.slice(0, 200).map((e, i) => {
                    const t = persona(e.trabajadorId);
                    return (
                      <tr key={i}>
                        <td>
                          <strong>
                            {e.fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </strong>
                          <small className="bloque">{e.hora}</small>
                        </td>
                        <td>
                          <div className="celda-persona">
                            <Avatar nombres={t.nombres} apellidos={t.apellidos} foto={t.foto} tam={28} />
                            <span>
                              {t.nombres} {t.apellidos}
                            </span>
                          </div>
                        </td>
                        <td>
                          <strong className="texto-danger">{e.velocidad} km/h</strong>
                        </td>
                        <td>+{e.velocidad - indicadores.limiteVelocidad} km/h</td>
                        <td>{e.via}</td>
                        <td>
                          <a
                            className="enlace"
                            href={`https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lng}#map=17/${e.lat}/${e.lng}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {e.lat.toFixed(5)}, {e.lng.toFixed(5)} <FiExternalLink />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                  {excesos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="vacio">
                        Sin excesos de velocidad en este periodo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {excesos.length > 200 && (
                <small className="nota">Mostrando los 200 más recientes de {excesos.length}.</small>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
