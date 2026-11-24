import { useMemo, useState } from 'react';
import { FiEdit2, FiPlus, FiRotateCcw, FiSlash, FiMapPin } from 'react-icons/fi';
import Avatar from '../components/Avatar';
import ChipEficiencia from '../components/ChipEficiencia';
import FiltroPeriodo, { periodoInicial } from '../components/FiltroPeriodo';
import ProgramacionModal from '../components/ProgramacionModal';
import { useProgramacion } from '../context/ProgramacionContext';
import { useEmpresa } from '../hooks/useEmpresa';
import { porcentaje } from '../utils/eficiencia';
import { deTextoFecha, validarRango } from '../utils/fechas';
import { ESTADOS_VISITA, generarVisitas, textoPermanencia, textoRepeticion, TIPOS } from '../utils/visitas';

// El administrador programa rutas, obras y zonas y revisa si se cumplieron
export default function ProgramacionScreen() {
  const { trabajadores } = useEmpresa();
  const { programaciones, guardar, cambiarEstado } = useProgramacion();
  const [vista, setVista] = useState('programaciones');
  const [editando, setEditando] = useState(null); // null = cerrado, {} = nueva, objeto = editar
  const [aviso, setAviso] = useState(null);
  const [filtroTrab, setFiltroTrab] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [verCanceladas, setVerCanceladas] = useState(false);
  const [periodo, setPeriodo] = useState(periodoInicial('Semana'));
  const persona = (id) => trabajadores.find((t) => t.id === id);
  const ids = trabajadores.map((t) => t.id);

  const lista = programaciones.filter(
    (p) =>
      p.trabajadores.some((t) => ids.includes(t)) &&
      (!filtroTrab || p.trabajadores.includes(filtroTrab)) &&
      (!filtroTipo || p.tipo === filtroTipo) &&
      (verCanceladas || p.estado !== 'cancelada'),
  );

  const errorPeriodo = validarRango(periodo.desde, periodo.hasta);
  const visitas = useMemo(
    () =>
      errorPeriodo
        ? []
        : generarVisitas(
            programaciones,
            filtroTrab ? [filtroTrab] : ids,
            deTextoFecha(periodo.desde),
            deTextoFecha(periodo.hasta),
          ),
    [programaciones, filtroTrab, periodo, errorPeriodo, ids.join()],
  );
  const cuenta = (e) => visitas.filter((v) => v.estado === e).length;
  const cerradas = cuenta('cumplida') + cuenta('no_cumplida');
  const conPermanencia = visitas.filter((v) => v.permanenciaMin != null);
  const permanenciaProm = conPermanencia.length
    ? Math.round(conPermanencia.reduce((t, v) => t + v.permanenciaMin, 0) / conPermanencia.length)
    : null;

  const alGuardar = (p) => {
    const nombres = p.trabajadores
      .map((id) => persona(id)?.nombres)
      .filter(Boolean)
      .join(', ');
    guardar(p);
    setEditando(null);
    setAviso(`${p.id ? 'Programación actualizada' : 'Programación creada'}. Se notificó a: ${nombres}.`);
  };

  const ubicacion = (p) =>
    p.tipo === 'ruta'
      ? `${p.puntos.length} puntos: ${p.puntos.map((x) => x.nombre).join(' → ')}`
      : p.tipo === 'obra'
        ? `${p.puntos[0]?.nombre ?? '—'} · radio ${p.radio} m`
        : `Área de ${p.area.length} puntos`;

  return (
    <div className="pagina">
      <div className="barra">
        <div className="segmentos">
          <button className={vista === 'programaciones' ? 'activo' : ''} onClick={() => setVista('programaciones')}>
            Programaciones
          </button>
          <button className={vista === 'cumplimiento' ? 'activo' : ''} onClick={() => setVista('cumplimiento')}>
            Cumplimiento de visitas
          </button>
        </div>
        <select value={filtroTrab} onChange={(e) => setFiltroTrab(e.target.value)}>
          <option value="">Todos los trabajadores</option>
          {trabajadores.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombres} {t.apellidos}
            </option>
          ))}
        </select>
        {vista === 'programaciones' ? (
          <>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Rutas, obras y zonas</option>
              {Object.entries(TIPOS).map(([k, t]) => (
                <option key={k} value={k}>
                  {t.texto}s
                </option>
              ))}
            </select>
            <label className="check">
              <input type="checkbox" checked={verCanceladas} onChange={(e) => setVerCanceladas(e.target.checked)} /> Ver
              canceladas
            </label>
            <button className="btn primario" onClick={() => setEditando({})}>
              <FiPlus /> Nueva programación
            </button>
          </>
        ) : (
          <FiltroPeriodo valor={periodo} onCambiar={setPeriodo} error={errorPeriodo} />
        )}
      </div>

      {aviso && (
        <div className="aviso exito" onClick={() => setAviso(null)}>
          {aviso}
        </div>
      )}

      {vista === 'programaciones' ? (
        <section className="panel">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Programación</th>
                <th>Trabajadores</th>
                <th>Llegada estimada</th>
                <th>Repetición</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} className={p.estado === 'cancelada' ? 'fila-cancelada' : ''}>
                  <td>
                    <span className={`chip ${TIPOS[p.tipo].clase}`}>{TIPOS[p.tipo].texto}</span>
                  </td>
                  <td className="celda-texto">
                    <strong>{p.titulo}</strong>
                    <small className="bloque">
                      <FiMapPin /> {ubicacion(p)}
                    </small>
                    {p.descripcion && <small className="bloque">{p.descripcion}</small>}
                  </td>
                  <td>
                    <div className="avatares">
                      {p.trabajadores.map((id) => {
                        const t = persona(id);
                        return t ? (
                          <span key={id} title={`${t.nombres} ${t.apellidos}`}>
                            <Avatar nombres={t.nombres} apellidos={t.apellidos} foto={t.foto} tam={28} />
                          </span>
                        ) : null;
                      })}
                    </div>
                  </td>
                  <td>
                    <strong>{p.hora}</strong>
                    <small className="bloque">desde {deTextoFecha(p.fecha).toLocaleDateString('es-CO')}</small>
                  </td>
                  <td>
                    <small>{textoRepeticion(p.repeticion)}</small>
                  </td>
                  <td>
                    <span className={`chip ${p.estado === 'activa' ? 'ok' : 'muted'}`}>
                      {p.estado === 'activa' ? 'Activa' : 'Cancelada'}
                    </span>
                  </td>
                  <td className="acciones">
                    <button className="btn peq" onClick={() => setEditando(p)} title="Editar o reasignar">
                      <FiEdit2 /> Editar
                    </button>
                    {p.estado === 'activa' ? (
                      <button
                        className="btn peq enlace-peligro"
                        onClick={() => {
                          cambiarEstado(p.id, 'cancelada');
                          setAviso(`"${p.titulo}" cancelada. Se notificó a los trabajadores.`);
                        }}
                      >
                        <FiSlash /> Cancelar
                      </button>
                    ) : (
                      <button className="btn peq" onClick={() => cambiarEstado(p.id, 'activa')}>
                        <FiRotateCcw /> Reactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={7} className="vacio">
                    No hay programaciones con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <small className="nota">
            Demo: las programaciones se guardan en este navegador. Con la base de datos llegarán al celular de cada
            trabajador.
          </small>
        </section>
      ) : errorPeriodo ? (
        <div className="aviso error">{errorPeriodo}</div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <span>Visitas programadas</span>
              <strong>{visitas.length}</strong>
              <small>{cuenta('pendiente')} pendientes</small>
            </div>
            <div className="kpi">
              <span>Cumplimiento</span>
              <ChipEficiencia pct={porcentaje(cuenta('cumplida'), cerradas)} grande />
              <small>
                {cuenta('cumplida')} cumplidas de {cerradas}
              </small>
            </div>
            <div className="kpi">
              <span>No cumplidas</span>
              <strong className={cuenta('no_cumplida') ? 'texto-danger' : ''}>{cuenta('no_cumplida')}</strong>
              <small>terminó el día sin llegar</small>
            </div>
            <div className="kpi">
              <span>Permanencia promedio</span>
              <strong>{textoPermanencia(permanenciaProm)}</strong>
              <small>en cada lugar</small>
            </div>
          </div>
          <section className="panel">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Trabajador</th>
                  <th>Visita</th>
                  <th>Estimada</th>
                  <th>Estado</th>
                  <th>Llegada</th>
                  <th>Salida</th>
                  <th>Permanencia</th>
                </tr>
              </thead>
              <tbody>
                {visitas.slice(0, 300).map((v) => {
                  const t = persona(v.trabajadorId);
                  return (
                    <tr key={v.id}>
                      <td>
                        <strong>
                          {v.fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
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
                      <td>
                        <span className={`chip ${TIPOS[v.tipo].clase}`}>{TIPOS[v.tipo].texto}</span> {v.titulo}
                        {v.puntosTotal != null && (
                          <small className="bloque">
                            {v.puntosVisitados} de {v.puntosTotal} puntos
                          </small>
                        )}
                      </td>
                      <td>{v.horaEstimada}</td>
                      <td>
                        <span className={`chip ${ESTADOS_VISITA[v.estado].clase}`}>
                          {ESTADOS_VISITA[v.estado].texto}
                        </span>
                      </td>
                      <td>{v.llegada ?? '—'}</td>
                      <td>{v.salida ?? (v.llegada ? <span className="chip info">En el lugar</span> : '—')}</td>
                      <td>{textoPermanencia(v.permanenciaMin)}</td>
                    </tr>
                  );
                })}
                {visitas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="vacio">
                      No hay visitas programadas en este periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <small className="nota">
              "Cumplida" se marca sola cuando el GPS confirma la llegada al lugar; "No cumplida" si termina el día sin
              llegar.
            </small>
          </section>
        </>
      )}

      {editando && (
        <ProgramacionModal
          inicial={editando.id ? editando : null}
          trabajadores={trabajadores}
          onGuardar={alGuardar}
          onCerrar={() => setEditando(null)}
        />
      )}
    </div>
  );
}
