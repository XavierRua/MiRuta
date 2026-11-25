import { useState } from 'react';
import { FiCheck, FiPlus, FiRotateCcw, FiX } from 'react-icons/fi';
import {
  IoBody,
  IoBook,
  IoBriefcase,
  IoCafe,
  IoCar,
  IoDocumentText,
  IoMedkit,
  IoPause,
  IoPeople,
  IoRestaurant,
  IoSchool,
  IoWater,
} from 'react-icons/io5';
import { FORMULARIOS_DEFECTO, ICONOS_PAUSA, minutosDePausa, textoDuracion } from '../config/formularios';
import { PERMISOS_WEB, ROLES_WEB, ROLES_CONFIGURABLES } from '../config/permisos';
import { useNovedades } from '../context/NovedadesContext';
import { usePermisos } from '../context/PermisosContext';

// Los mismos íconos de la app (Ionicons), para ver aquí cómo se verá la tarjeta
const ICONOS = {
  cafe: IoCafe,
  restaurant: IoRestaurant,
  body: IoBody,
  school: IoSchool,
  people: IoPeople,
  medkit: IoMedkit,
  'document-text': IoDocumentText,
  water: IoWater,
  briefcase: IoBriefcase,
  car: IoCar,
  book: IoBook,
  pause: IoPause,
};
export const IconoPausa = ({ nombre }) => {
  const I = ICONOS[nombre] ?? IoPause;
  return <I />;
};
const nuevoId = () => `act-${Date.now().toString(36)}`;

// Pausas y descansos del trabajador, por empresa (permiso web.pausas.configurar):
// - Descansos: duración del desayuno, del almuerzo y de la pausa activa, y cuántas pausas activas por jornada.
// - Tipos de actividad autorizada (capacitación, reunión, cita médica…): se habilitan a cada trabajador por
//   fecha en "Actividades autorizadas" (permiso web.actividades.autorizar).
export default function ConfigPausas() {
  const { formularios, guardarParte } = useNovedades();
  const { esAdministrador, tiene, cambiarPermiso } = usePermisos();
  const [descansos, setDescansos] = useState(formularios.descansos);
  const [tipos, setTipos] = useState(formularios.tiposActividad);
  const [cadaMin, setCadaMin] = useState(formularios.pausaActivaCadaMin);
  const [guardado, setGuardado] = useState(false);
  const cambio =
    (fn) =>
    (...args) => {
      fn(...args);
      setGuardado(false);
    };
  const editarDescanso = cambio((i, c) => setDescansos(descansos.map((d, k) => (k === i ? { ...d, ...c } : d))));
  const editarTipo = cambio((i, c) => setTipos(tipos.map((t, k) => (k === i ? { ...t, ...c } : t))));
  const num = (v) => (v === '' ? '' : Number(v));

  const errores = [
    descansos.some((d) => !(d.duracion > 0)) && 'La duración de cada descanso debe ser mayor que cero.',
    descansos.some((d) => minutosDePausa(d) > 240) && 'Un descanso no puede durar más de 4 horas.',
    descansos.some((d) => d.veces != null && !(d.veces >= 1 && d.veces <= 5)) &&
      'Las veces por jornada deben estar entre 1 y 5.',
    descansos.some((d) => d.bolsaMin != null && !(d.bolsaMin >= minutosDePausa(d) && d.bolsaMin <= 240)) &&
      'La bolsa de pausa activa debe ser mayor o igual al máximo por pausa y de máximo 240 minutos.',
    !(cadaMin >= 30 && cadaMin <= 480) && 'El recordatorio de pausa activa debe estar entre 30 y 480 minutos.',
    tipos.some((t) => !t.texto.trim()) && 'Cada tipo de actividad necesita un nombre.',
  ].filter(Boolean);

  const activos = descansos.filter((d) => d.activo);

  return (
    <>
      <section className="panel panel-pausas">
        <h2>Pausas de descanso</h2>
        <p className="nota">
          El trabajador las inicia cuando las necesita; se cierran solas al cumplir este tiempo y suena una alarma.
          Desayuno y almuerzo se toman las veces por jornada que indiques. La pausa activa es una{' '}
          <strong>bolsa de minutos del día</strong>: la reparte como quiera (por ejemplo 6 pausas de 5 min) y cada pausa
          dura como máximo el tiempo indicado. Mientras dura una pausa no se pide el reporte y su hora se extiende por
          los minutos de la pausa.
        </p>
        <div className="editor-lista">
          <div className="editor-fila descansos encabezado">
            <span>Pausa</span>
            <span>Duración de cada pausa</span>
            <span>Límite del día</span>
            <span>Activa</span>
          </div>
          {descansos.map((d, i) => (
            <div key={d.id} className={`editor-fila descansos ${d.activo ? '' : 'inactiva'}`}>
              <div className="icono-pausa-sel">
                <span className="icono-pausa">
                  <IconoPausa nombre={d.icono} />
                </span>
                <strong>{d.texto}</strong>
              </div>
              <div className="duracion">
                <input
                  type="number"
                  min={d.unidad === 'h' ? 0.5 : 1}
                  step={d.unidad === 'h' ? 0.5 : 5}
                  value={d.duracion}
                  onChange={(e) => editarDescanso(i, { duracion: num(e.target.value) })}
                />
                <select value={d.unidad} onChange={(e) => editarDescanso(i, { unidad: e.target.value })}>
                  <option value="min">min</option>
                  <option value="h">horas</option>
                </select>
                {d.bolsaMin != null && <em className="nota">máximo</em>}
              </div>
              {d.bolsaMin != null ? (
                <div className="duracion">
                  <input
                    type="number"
                    min={5}
                    max={240}
                    step={5}
                    value={d.bolsaMin}
                    onChange={(e) => editarDescanso(i, { bolsaMin: num(e.target.value) })}
                  />
                  <em className="nota">min en total al día</em>
                </div>
              ) : (
                <div className="duracion">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={d.veces ?? 1}
                    onChange={(e) => editarDescanso(i, { veces: num(e.target.value) })}
                  />
                  <em className="nota">{d.veces === 1 ? 'vez' : 'veces'} por jornada</em>
                </div>
              )}
              <label className="interruptor">
                <input
                  type="checkbox"
                  checked={d.activo}
                  disabled={d.id === 'pausa_activa'}
                  onChange={(e) => editarDescanso(i, { activo: e.target.checked })}
                />
                <span />
              </label>
            </div>
          ))}
        </div>

        <div className="rangos">
          <label className="campo-config">
            <span>Recordatorio de pausa activa cada</span>
            <div className="con-unidad">
              <input
                type="number"
                min={30}
                max={480}
                step={15}
                value={cadaMin}
                onChange={cambio((e) => setCadaMin(num(e.target.value)))}
              />
              <em>min{cadaMin >= 60 ? ` (${textoDuracion(cadaMin)})` : ''}</em>
            </div>
          </label>
        </div>

        <h3 className="subtitulo">Tipos de actividad autorizada</h3>
        <p className="nota">
          No aparecen solas en la app: se habilitan a cada trabajador para una fecha en el menú{' '}
          <strong>Actividades autorizadas</strong>, eligiendo tiempo libre o tiempo asignado.
        </p>
        <div className="editor-lista">
          {tipos.map((t, i) => (
            <div key={t.id} className="editor-fila tipos-actividad">
              <div className="icono-pausa-sel">
                <span className="icono-pausa">
                  <IconoPausa nombre={t.icono} />
                </span>
                <select value={t.icono} onChange={(e) => editarTipo(i, { icono: e.target.value })} title="Ícono">
                  {ICONOS_PAUSA.map(([k, n]) => (
                    <option key={k} value={k}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={t.texto}
                placeholder="Nombre de la actividad"
                onChange={(e) => editarTipo(i, { texto: e.target.value })}
              />
              <button
                className="icono"
                onClick={cambio(() => setTipos(tipos.filter((_, k) => k !== i)))}
                title="Quitar"
              >
                <FiX />
              </button>
            </div>
          ))}
          <button
            className="btn peq"
            onClick={cambio(() => setTipos([...tipos, { id: nuevoId(), texto: '', icono: 'briefcase' }]))}
          >
            <FiPlus /> Agregar tipo de actividad
          </button>
        </div>

        {/* Así se verá en la pestaña Jornada de la app (mismo diseño de Indicadores diarios) */}
        <h3 className="subtitulo">Vista previa en la app</h3>
        <div className="vista-pausas">
          {activos.map((d) => (
            <div key={d.id} className="tarjeta-pausa">
              <span className="icono-pausa">
                <IconoPausa nombre={d.icono} />
              </span>
              <strong>{textoDuracion(d.bolsaMin ?? (minutosDePausa(d) || 0))}</strong>
              <span>{d.texto}</span>
              <small>
                {d.bolsaMin != null ? `Te quedan hoy (máx. ${minutosDePausa(d)} por pausa)` : 'Toca para iniciar'}
              </small>
            </div>
          ))}
        </div>

        {errores.length > 0 && <div className="aviso error">{errores.join(' ')}</div>}
        <div className="barra">
          <button
            className="btn primario"
            disabled={errores.length > 0}
            onClick={() => {
              guardarParte({
                descansos,
                tiposActividad: tipos,
                pausaActivaCadaMin: cadaMin,
              });
              setGuardado(true);
            }}
          >
            <FiCheck /> Guardar pausas
          </button>
          <button
            className="btn"
            onClick={cambio(() => {
              setDescansos(FORMULARIOS_DEFECTO.descansos);
              setTipos(FORMULARIOS_DEFECTO.tiposActividad);
              setCadaMin(FORMULARIOS_DEFECTO.pausaActivaCadaMin);
            })}
          >
            <FiRotateCcw /> Valores por defecto
          </button>
          {guardado && <span className="chip ok">Guardado. La app los usará desde el próximo inicio de jornada.</span>}
        </div>
      </section>

      {/* Solo el administrador decide qué otros perfiles tienen cada permiso (son independientes) */}
      {esAdministrador && (
        <section className="panel">
          <h2>¿Quién más puede hacerlo?</h2>
          <p className="nota">El administrador siempre puede. Son dos permisos independientes.</p>
          <div className="tabla-permisos">
            <div className="fila-permiso encabezado">
              <span>Perfil</span>
              {['web.pausas.configurar', 'web.actividades.autorizar'].map((k) => (
                <span key={k}>{PERMISOS_WEB[k].texto}</span>
              ))}
            </div>
            {ROLES_CONFIGURABLES.map((r) => (
              <div key={r} className="fila-permiso">
                <span>{ROLES_WEB.find((x) => x.id === r).texto}</span>
                {['web.pausas.configurar', 'web.actividades.autorizar'].map((k) => (
                  <label key={k} className="interruptor">
                    <input
                      type="checkbox"
                      checked={tiene(r, k)}
                      onChange={(e) => cambiarPermiso(r, k, e.target.checked)}
                    />
                    <span />
                  </label>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
