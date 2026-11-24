import { useMemo, useState } from 'react';
import { FiDownload, FiMoon } from 'react-icons/fi';
import Avatar from '../components/Avatar';
import ChipEficiencia from '../components/ChipEficiencia';
import FiltroPeriodo, { periodoInicial } from '../components/FiltroPeriodo';
import { useEmpresa } from '../hooks/useEmpresa';
import { api } from '../services/api';
import { porcentaje } from '../utils/eficiencia';
import { deTextoFecha, validarRango } from '../utils/fechas';

const hora = (f) => f.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
const horas = (n) => `${String(Math.round(n * 10) / 10).replace('.', ',')} h`;

// Horas extras de todos los trabajadores: totales por trabajador y detalle de cada sesión
export default function HorasExtraScreen() {
  const { empresaId, trabajadores } = useEmpresa();
  const [trabajadorId, setTrabajadorId] = useState('');
  const [filtro, setFiltro] = useState(periodoInicial('Mes'));
  const error = validarRango(filtro.desde, filtro.hasta);
  const persona = (id) => trabajadores.find((t) => t.id === id);

  const sesiones = useMemo(
    () =>
      error
        ? []
        : api.getHorasExtra({
            empresaId,
            trabajadorId,
            desde: deTextoFecha(filtro.desde),
            hasta: deTextoFecha(filtro.hasta),
          }),
    [empresaId, trabajadorId, filtro, error],
  );

  // Totales por trabajador
  const porTrabajador = [
    ...sesiones
      .reduce((m, s) => {
        const r = m.get(s.trabajadorId) ?? {
          trabajadorId: s.trabajadorId,
          sesiones: 0,
          horas: 0,
          km: 0,
          esperados: 0,
          enviados: 0,
        };
        r.sesiones += 1;
        r.horas += s.horas;
        r.km += s.km;
        r.esperados += s.esperados;
        r.enviados += s.enviados;
        return m.set(s.trabajadorId, r);
      }, new Map())
      .values(),
  ].sort((a, b) => b.horas - a.horas);

  const totalHoras = sesiones.reduce((t, s) => t + s.horas, 0);
  const totalKm = sesiones.reduce((t, s) => t + s.km, 0);
  const enCurso = sesiones.filter((s) => !s.fin).length;
  const efExtra = porcentaje(
    sesiones.reduce((t, s) => t + s.enviados, 0),
    sesiones.reduce((t, s) => t + s.esperados, 0),
  );

  return (
    <div className="pagina">
      <div className="barra">
        <select value={trabajadorId} onChange={(e) => setTrabajadorId(e.target.value)}>
          <option value="">Todos los trabajadores</option>
          {trabajadores.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombres} {t.apellidos}
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
          <div className="kpis">
            <div className="kpi kpi-extra">
              <span>Total horas extras</span>
              <strong>{horas(totalHoras)}</strong>
              <small>{sesiones.length} sesiones</small>
            </div>
            <div className="kpi">
              <span>En curso ahora</span>
              <strong className={enCurso ? 'texto-morado' : ''}>{enCurso}</strong>
              <small>trabajadores en horas extras</small>
            </div>
            <div className="kpi">
              <span>Km en horas extras</span>
              <strong>{(Math.round(totalKm * 10) / 10).toLocaleString('es-CO')} km</strong>
              <small>aparte de la jornada normal</small>
            </div>
            <div className="kpi">
              <span>Reportes en horas extras</span>
              <ChipEficiencia pct={efExtra} grande />
              <small>enviados a tiempo</small>
            </div>
          </div>

          <div className="hist-layout">
            <section className="panel">
              <h2>Detalle de sesiones</h2>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Trabajador</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Horas</th>
                    <th>Km</th>
                    <th>Reportes</th>
                  </tr>
                </thead>
                <tbody>
                  {sesiones.map((s) => {
                    const t = persona(s.trabajadorId);
                    return (
                      <tr key={s.id}>
                        <td>
                          <strong>
                            {s.fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </strong>
                        </td>
                        <td>
                          <div className="celda-persona">
                            <Avatar nombres={t.nombres} apellidos={t.apellidos} foto={t.foto} tam={28} />
                            <span>
                              {t.nombres} {t.apellidos}
                            </span>
                          </div>
                        </td>
                        <td>{hora(s.inicio)}</td>
                        <td>{s.fin ? hora(s.fin) : <span className="chip morado">En curso</span>}</td>
                        <td>
                          <span className="chip morado">
                            <FiMoon /> {horas(s.horas)}
                          </span>
                        </td>
                        <td>{s.km}</td>
                        <td>
                          {s.enviados}/{s.esperados}
                        </td>
                      </tr>
                    );
                  })}
                  {sesiones.length === 0 && (
                    <tr>
                      <td colSpan={7} className="vacio">
                        No hay horas extras en este periodo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="panel">
              <h2>Total por trabajador</h2>
              <ul className="lista-totales">
                {porTrabajador.map((r) => {
                  const t = persona(r.trabajadorId);
                  return (
                    <li key={r.trabajadorId}>
                      <Avatar nombres={t.nombres} apellidos={t.apellidos} foto={t.foto} tam={32} />
                      <div className="datos">
                        <strong>
                          {t.nombres} {t.apellidos}
                        </strong>
                        <small>
                          {r.sesiones} {r.sesiones === 1 ? 'sesión' : 'sesiones'} ·{' '}
                          {(Math.round(r.km * 10) / 10).toLocaleString('es-CO')} km · reportes {r.enviados}/
                          {r.esperados}
                        </small>
                      </div>
                      <span className="chip morado">{horas(r.horas)}</span>
                    </li>
                  );
                })}
                {porTrabajador.length === 0 && <li className="vacio">Sin horas extras.</li>}
              </ul>
              <small className="nota">
                Inicio y fin se toman con la hora del servidor. Te llega una alerta cuando un trabajador inicia o
                finaliza horas extras.
              </small>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
