import { useMemo, useState } from 'react';
import ExcluirHorasModal from '../components/ExcluirHorasModal';
import { useNovedades } from '../context/NovedadesContext';
import { FiCamera, FiDownload, FiExternalLink, FiMapPin } from 'react-icons/fi';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import { useEmpresa } from '../hooks/useEmpresa';
import { api } from '../services/api';

const estados = {
  a_tiempo: { texto: 'Reportó', clase: 'ok' },
  no_reporto: { texto: 'No reportó', clase: 'danger' },
  en_pausa: { texto: 'En pausa', clase: 'morado' },
};
const filtrosEstado = ['todos', 'a_tiempo', 'no_reporto', 'en_pausa'];
const POR_PAGINA = 50;

// "2026-11-23" ⇄ Date local a las 00:00
const aTexto = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const aFecha = (t) => new Date(`${t}T00:00`);
const hora = (d) => d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

export default function ReportesScreen() {
  const { empresaId, trabajadores } = useEmpresa();
  const hoy = aTexto(new Date());
  const [trabajadorId, setTrabajadorId] = useState('');
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [estado, setEstado] = useState('todos');
  const [visibles, setVisibles] = useState(POR_PAGINA);
  const [abierto, setAbierto] = useState(null);
  const [excluyendo, setExcluyendo] = useState(false);
  const { exclusiones, guardarExclusion, quitarExclusion } = useNovedades();

  // Validación del rango de fechas
  const error =
    !desde || !hasta
      ? 'Elige las dos fechas.'
      : desde > hoy || hasta > hoy
        ? 'Las fechas no pueden ser posteriores a hoy.'
        : hasta < desde
          ? 'La fecha "Hasta" no puede ser anterior a "Desde".'
          : null;

  // Las horas excluidas (capacitaciones) no se piden: se quitan de la lista y de los indicadores
  const excluida = (r) =>
    exclusiones.some((e) => {
      const h = Number(r.franja.split(':')[0]);
      return (
        e.trabajadores.includes(r.trabajadorId) &&
        e.fecha === aTexto(r.fecha) &&
        h >= Number(e.desde.split(':')[0]) &&
        h < Number(e.hasta.split(':')[0])
      );
    });
  const todos = useMemo(
    () =>
      error
        ? []
        : api
            .getReportes({ empresaId, trabajadorId, desde: aFecha(desde), hasta: aFecha(hasta) })
            .filter((r) => !excluida(r)),
    [empresaId, trabajadorId, desde, hasta, error, exclusiones],
  );
  const lista = estado === 'todos' ? todos : todos.filter((r) => r.estado === estado);
  const persona = (id) => trabajadores.find((t) => t.id === id);

  const cuenta = (e) => todos.filter((r) => r.estado === e).length;
  const recibidos = cuenta('a_tiempo');
  // Las horas "En pausa" (cubiertas por una pausa completa) no cuentan en el cumplimiento
  const esperados = todos.length - cuenta('en_pausa');
  const pct = esperados ? Math.round((recibidos / esperados) * 100) : 0;
  const pesoMB = (todos.reduce((s, r) => s + r.pesoKB, 0) / 1024).toFixed(1);

  const cambiar = (fn) => (e) => {
    fn(e.target.value);
    setVisibles(POR_PAGINA);
  };

  return (
    <div className="pagina">
      <div className="barra">
        <select value={trabajadorId} onChange={cambiar(setTrabajadorId)}>
          <option value="">Todos los trabajadores</option>
          {trabajadores.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombres} {t.apellidos}
            </option>
          ))}
        </select>
        <label className="campo-fecha">
          Desde
          <input type="date" value={desde} max={hoy} onChange={cambiar(setDesde)} className={error ? 'invalido' : ''} />
        </label>
        <label className="campo-fecha">
          Hasta
          <input
            type="date"
            value={hasta}
            min={desde}
            max={hoy}
            onChange={cambiar(setHasta)}
            className={error ? 'invalido' : ''}
          />
        </label>
        <div className="segmentos">
          {filtrosEstado.map((e) => (
            <button key={e} className={estado === e ? 'activo' : ''} onClick={() => setEstado(e)}>
              {e === 'todos' ? 'Todos' : estados[e].texto}
            </button>
          ))}
        </div>
        <button className="btn">
          <FiDownload /> Excel
        </button>
        {/* Permiso web.reportes.excluirHoras (administrador, supervisor, SST según configuración) */}
        <button className="btn" onClick={() => setExcluyendo(true)}>
          Excluir horas (capacitación)
        </button>
      </div>

      {exclusiones.length > 0 && (
        <section className="panel">
          <h2>Horas excluidas de los reportes ({exclusiones.length})</h2>
          <ul className="lista-exclusiones">
            {exclusiones.map((e) => (
              <li key={e.id}>
                <div>
                  <strong>
                    {new Date(`${e.fecha}T00:00`).toLocaleDateString('es-CO', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    · {e.desde}–{e.hasta} · {e.motivo}
                  </strong>
                  <small className="bloque">
                    {e.trabajadores.length === trabajadores.length
                      ? 'Todos los trabajadores'
                      : e.trabajadores.map((id) => persona(id)?.nombres).join(', ')}
                  </small>
                </div>
                <button className="btn peq" onClick={() => quitarExclusion(e.id)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
          <small className="nota">
            Esas horas no se piden en la app y no cuentan como "No reportó" ni para la eficiencia.
          </small>
        </section>
      )}

      {error ? (
        <div className="aviso error">{error}</div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <span>Reportes recibidos</span>
              <strong>
                {recibidos} / {esperados}
              </strong>
            </div>
            <div className="kpi">
              <span>Cumplimiento</span>
              <strong>{pct} %</strong>
            </div>
            <div className="kpi">
              <span>No reportó</span>
              <strong className="rojo">{cuenta('no_reporto')}</strong>
            </div>
            <div className="kpi">
              <span>Peso de las fotos</span>
              <strong>{pesoMB} MB</strong>
            </div>
          </div>

          <section className="panel">
            <table>
              <thead>
                <tr>
                  <th>Fecha y franja</th>
                  <th>Trabajador</th>
                  <th>Estado</th>
                  <th>Tarea realizada</th>
                  <th>Lugar</th>
                  <th>Fotos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.slice(0, visibles).map((r) => {
                  const t = persona(r.trabajadorId);
                  return (
                    <tr key={r.id} className={r.estado === 'no_reporto' ? 'fila-alerta' : ''}>
                      <td>
                        <strong>
                          {r.fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </strong>
                        <small className="bloque">
                          {r.franja}
                          {r.enviadoEn && ` · enviado ${hora(r.enviadoEn)}`}
                        </small>
                        {/* Ventana extendida por una pausa: "Extendido +15 min por desayuno" */}
                        {r.extension && <small className="bloque texto-morado">{r.extension}</small>}
                      </td>
                      <td>
                        <div className="celda-persona">
                          <Avatar nombres={t.nombres} apellidos={t.apellidos} foto={t.foto} tam={32} />
                          <span>
                            {t.nombres} {t.apellidos}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`chip ${estados[r.estado].clase}`}>
                          {r.estado === 'en_pausa' ? `En pausa – ${r.pausa}` : estados[r.estado].texto}
                        </span>
                      </td>
                      <td className="celda-texto">
                        {r.descripcion ??
                          (r.estado === 'en_pausa' ? (
                            <em className="nota">Toda la hora en pausa: no necesitaba reporte</em>
                          ) : (
                            <em className="nota">Sin reporte</em>
                          ))}
                      </td>
                      <td>{r.estado !== 'a_tiempo' ? '—' : r.lugar}</td>
                      <td>
                        {r.fotos > 0 && (
                          <span className="fotos-cuenta">
                            <FiCamera /> {r.fotos}
                          </span>
                        )}
                      </td>
                      <td>
                        {r.estado === 'a_tiempo' && (
                          <button className="btn peq" onClick={() => setAbierto(r)}>
                            Ver
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {lista.length === 0 && (
                  <tr>
                    <td colSpan={7} className="vacio">
                      No hay reportes con estos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {lista.length > visibles && (
              <button className="btn ancho mas" onClick={() => setVisibles((v) => v + POR_PAGINA)}>
                Mostrar más ({lista.length - visibles} restantes)
              </button>
            )}
          </section>
          <small className="nota">
            Cada reporte solo se acepta dentro de su hora, según la hora del servidor. Las horas sin reporte quedan como
            "No reportó" y generan una alerta.
          </small>
        </>
      )}

      {abierto && (
        <DetalleReporte
          reporte={abierto}
          trabajador={persona(abierto.trabajadorId)}
          onCerrar={() => setAbierto(null)}
        />
      )}
      {excluyendo && (
        <ExcluirHorasModal
          trabajadores={trabajadores}
          onCerrar={() => setExcluyendo(false)}
          onGuardar={(ex) => {
            guardarExclusion(ex);
            setExcluyendo(false);
          }}
        />
      )}
    </div>
  );
}

function DetalleReporte({ reporte: r, trabajador: t, onCerrar }) {
  const mapa = `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=18/${r.lat}/${r.lng}`;
  return (
    <Modal titulo={`Reporte ${r.franja}`} onCerrar={onCerrar}>
      <div className="detalle-cab">
        <div className="selfie-grande">
          <Avatar nombres={t.nombres} apellidos={t.apellidos} foto={t.foto} tam={96} />
          <small>Selfie tomada con cámara</small>
        </div>
        <div className="detalle-datos">
          <h3>
            {t.nombres} {t.apellidos}
          </h3>
          <dl>
            <dt>Fecha</dt>
            <dd>
              {r.fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </dd>
            <dt>Enviado</dt>
            <dd>
              {hora(r.enviadoEn)} <span className={`chip ${estados[r.estado].clase}`}>{estados[r.estado].texto}</span>
            </dd>
            <dt>Lugar</dt>
            <dd>{r.lugar}</dd>
            <dt>GPS</dt>
            <dd>
              {r.lat.toFixed(5)}, {r.lng.toFixed(5)} (±{r.precisionM} m){' '}
              <a href={mapa} target="_blank" rel="noreferrer">
                <FiMapPin /> Ver en mapa <FiExternalLink />
              </a>
            </dd>
          </dl>
        </div>
      </div>
      <h3>Tarea realizada</h3>
      <p className="detalle-texto">{r.descripcion}</p>
      <h3>Fotos de la tarea ({r.fotos})</h3>
      <div className="fotos-reporte">
        {Array.from({ length: r.fotos }, (_, i) => (
          <div key={i} className="foto-ejemplo">
            <FiCamera />
            <span>Foto {i + 1}</span>
          </div>
        ))}
      </div>
      <small className="nota">
        Peso total del reporte: {r.pesoKB} KB · las fotos de ejemplo se reemplazarán por las reales.
      </small>
    </Modal>
  );
}
