import { FiDownload, FiFileText } from 'react-icons/fi';
import Avatar from './Avatar';
import ChipEficiencia from './ChipEficiencia';
import { descargarExcel, descargarPdf } from '../utils/exportar';
import { useConfig } from '../context/ConfigContext';
import { nivelEficiencia } from '../utils/eficiencia';
import { coma, comparativo, detalleDe, fechaCorta, tablasParaExportar, totalDe } from '../utils/filtrosHistorial';

const TITULOS = {
  horasExtra: 'Horas extras',
  km: 'Kilometraje',
  eficiencia: 'Eficiencia de reportes',
  excesos: 'Excesos de velocidad',
};

// Filtro del historial del administrador para un trabajador o para todos:
// total del período, resumen comparativo entre trabajadores, detalle por día y descarga en Excel o PDF
export default function FiltroHistorialAdmin({ tipo, dias, trabajadores, persona, todos, periodoTexto, limite }) {
  const { indicadores } = useConfig();
  const COLOR_NIVEL = { ok: '#16a34a', naranja: '#ea580c', danger: '#dc2626', muted: '#cbd5e1' };
  const total = totalDe(tipo, dias);
  const comp = todos ? comparativo(tipo, dias, trabajadores) : [];
  const detalle = detalleDe(tipo, dias);
  const maxComp = Math.max(1, ...comp.map((c) => c.valor ?? 0));
  const quien = todos ? 'Todos los trabajadores' : `${trabajadores[0]?.nombres} ${trabajadores[0]?.apellidos}`;
  const archivo = `MiRuta-${TITULOS[tipo]}-${periodoTexto}`.replace(/[^\wáéíóúñÁÉÍÓÚÑ-]+/g, '_');

  const exportar = (formato) => {
    const tablas = tablasParaExportar(tipo, dias, trabajadores, persona, todos);
    if (formato === 'excel')
      descargarExcel(
        archivo,
        tablas.map((t) => ({ nombre: t.titulo === 'Detalle por día' ? 'Detalle' : 'Comparativo', filas: t.filas })),
      );
    else descargarPdf(TITULOS[tipo], `${quien} · ${periodoTexto}`, tablas);
  };

  const valorComp = (c) =>
    ({
      horasExtra: `${coma(c.valor)} h`,
      km: `${coma(c.valor)} km`,
      eficiencia: <ChipEficiencia pct={c.valor} />,
      excesos: c.valor,
    })[tipo];

  return (
    <>
      <div className="barra filtro-acciones">
        <span className="nota">
          {TITULOS[tipo]} · {quien} · {periodoTexto}
        </span>
        <button className="btn" onClick={() => exportar('excel')}>
          <FiDownload /> Excel
        </button>
        <button className="btn" onClick={() => exportar('pdf')}>
          <FiFileText /> PDF
        </button>
      </div>

      {/* Total del período */}
      <div className="kpis">
        {tipo === 'horasExtra' && (
          <>
            <Kpi titulo="Total horas extras" valor={`${coma(total.valor)} h`} clase="texto-morado" />
            <Kpi titulo="Días con horas extras" valor={total.dias} />
          </>
        )}
        {tipo === 'km' && (
          <>
            <Kpi titulo="Kilómetros recorridos" valor={`${coma(total.valor)} km`} />
            <Kpi titulo="Promedio por día" valor={`${coma(total.dias ? total.valor / total.dias : 0)} km`} />
          </>
        )}
        {tipo === 'eficiencia' && (
          <>
            <div className="kpi">
              <span>Eficiencia promedio</span>
              <ChipEficiencia pct={total.valor} grande />
              <small>promedio de {total.dias} días</small>
            </div>
            <Kpi titulo="Reportes a tiempo" valor={`${total.enviados} de ${total.esperados}`} />
          </>
        )}
        {tipo === 'excesos' && (
          <>
            <Kpi titulo="Excesos de velocidad" valor={total.valor} clase={total.valor ? 'texto-danger' : ''} />
            <Kpi
              titulo="Velocidad más alta"
              valor={total.velMax ? `${total.velMax} km/h` : '—'}
              sub={`límite ${limite} km/h`}
            />
          </>
        )}
      </div>

      {/* Resumen comparativo entre trabajadores */}
      {todos && (
        <section className="panel">
          <h2>Resumen comparativo</h2>
          <table>
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Días</th>
                <th>{TITULOS[tipo]}</th>
                <th className="col-barra"></th>
              </tr>
            </thead>
            <tbody>
              {comp.map((c) => (
                <tr key={c.t.id}>
                  <td>
                    <div className="celda-persona">
                      <Avatar nombres={c.t.nombres} apellidos={c.t.apellidos} foto={c.t.foto} tam={28} />
                      <span>
                        {c.t.nombres} {c.t.apellidos}
                      </span>
                    </div>
                  </td>
                  <td>{c.dias}</td>
                  <td>
                    <strong>{valorComp(c)}</strong>
                  </td>
                  <td className="col-barra">
                    <div className={`barra-comp ${tipo}`}>
                      <i
                        style={{
                          width: `${((c.valor ?? 0) / (tipo === 'eficiencia' ? 100 : maxComp)) * 100}%`,
                          ...(tipo === 'eficiencia' && {
                            background: COLOR_NIVEL[nivelEficiencia(c.valor, indicadores).clase] ?? COLOR_NIVEL.muted,
                          }),
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Detalle por día */}
      <section className="panel">
        <h2>Detalle por día ({detalle.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              {todos && <th>Trabajador</th>}
              {tipo === 'horasExtra' && (
                <>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Duración</th>
                  <th>Lugar</th>
                </>
              )}
              {tipo === 'km' && (
                <>
                  <th>Jornada</th>
                  <th>Horas extras</th>
                  <th>Total</th>
                </>
              )}
              {tipo === 'eficiencia' && (
                <>
                  <th>Reportes</th>
                  <th>Eficiencia</th>
                </>
              )}
              {tipo === 'excesos' && (
                <>
                  <th>Hora</th>
                  <th>Ubicación</th>
                  <th>Velocidad</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {detalle.map((x, i) => {
              const t = persona(x.d.trabajadorId);
              return (
                <tr key={i}>
                  <td>
                    <strong>{fechaCorta(x.d.fecha)}</strong>
                  </td>
                  {todos && (
                    <td>
                      {t.nombres} {t.apellidos}
                    </td>
                  )}
                  {tipo === 'horasExtra' && (
                    <>
                      <td>{x.inicio}</td>
                      <td>{x.fin}</td>
                      <td>
                        <span className="chip morado">{coma(x.horas)} h</span>
                      </td>
                      <td>{x.lugar ? <Mapa lat={x.lugar.lat} lng={x.lugar.lng} texto={x.lugar.nombre} /> : '—'}</td>
                    </>
                  )}
                  {tipo === 'km' && (
                    <>
                      <td>{coma(x.jornada)} km</td>
                      <td>{x.extra ? <span className="texto-morado">{coma(x.extra)} km</span> : '—'}</td>
                      <td>
                        <strong>{coma(x.total)} km</strong>
                      </td>
                    </>
                  )}
                  {tipo === 'eficiencia' && (
                    <>
                      <td>
                        {x.d.enviados} de {x.d.esperados}
                      </td>
                      <td>
                        <ChipEficiencia pct={x.pct} />
                      </td>
                    </>
                  )}
                  {tipo === 'excesos' && (
                    <>
                      <td>{x.e.hora}</td>
                      <td>
                        <Mapa
                          lat={x.e.lat}
                          lng={x.e.lng}
                          texto={`${x.e.via} · ${x.e.lat.toFixed(5)}, ${x.e.lng.toFixed(5)}`}
                        />
                      </td>
                      <td>
                        <span className="chip danger">{x.e.velocidad} km/h</span>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {detalle.length === 0 && (
              <tr>
                <td colSpan={7} className="vacio">
                  Sin datos de {TITULOS[tipo].toLowerCase()} en este período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Kpi({ titulo, valor, sub, clase = '' }) {
  return (
    <div className="kpi">
      <span>{titulo}</span>
      <strong className={clase}>{valor}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function Mapa({ lat, lng, texto }) {
  return (
    <a
      className="enlace"
      href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
      target="_blank"
      rel="noreferrer"
    >
      {texto}
    </a>
  );
}
