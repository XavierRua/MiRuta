import { useState } from 'react';
import { FiCheck, FiPlus, FiRotateCcw, FiX } from 'react-icons/fi';
import {
  IoBody,
  IoBook,
  IoBriefcase,
  IoCafe,
  IoCar,
  IoDocumentText,
  IoEllipsisHorizontalCircle,
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
const Icono = ({ nombre }) => {
  const I = ICONOS[nombre] ?? IoPause;
  return <I />;
};
const nuevoId = () => `pa-${Date.now().toString(36)}`;

// Pausas y descansos del trabajador. Las configura el administrador y los perfiles con el permiso
// "web.pausas.configurar" (por defecto también SST). La app las lee al iniciar la jornada.
export default function ConfigPausas() {
  const { formularios, guardarParte } = useNovedades();
  const { esAdministrador, tiene, cambiarPermiso } = usePermisos();
  const [pausas, setPausas] = useState(formularios.tiposPausa);
  const [cadaMin, setCadaMin] = useState(formularios.pausaActivaCadaMin);
  const [guardado, setGuardado] = useState(false);

  const editar = (i, cambio) => {
    setPausas(pausas.map((p, k) => (k === i ? { ...p, ...cambio } : p)));
    setGuardado(false);
  };
  const quitar = (i) => {
    setPausas(pausas.filter((_, k) => k !== i));
    setGuardado(false);
  };
  const agregar = () => {
    setPausas([
      ...pausas,
      { id: nuevoId(), texto: '', icono: 'pause', grupo: 'otras', duracion: 30, unidad: 'min', activo: true },
    ]);
    setGuardado(false);
  };

  const errores = [
    pausas.some((p) => !p.texto.trim()) && 'Cada pausa necesita un nombre.',
    pausas.some((p) => !(p.duracion > 0)) && 'La duración debe ser mayor que cero.',
    pausas.some((p) => minutosDePausa(p) > 600) && 'Una pausa no puede durar más de 10 horas.',
    !(cadaMin >= 30 && cadaMin <= 480) && 'El recordatorio de pausa activa debe estar entre 30 y 480 minutos.',
  ].filter(Boolean);

  const activas = pausas.filter((p) => p.activo);
  const principales = activas.filter((p) => p.grupo === 'principal');
  const otras = activas.filter((p) => p.grupo === 'otras');

  return (
    <>
      <section className="panel panel-pausas">
        <h2>Pausas y descansos</h2>
        <p className="nota">
          Cada pausa se cierra sola al cumplir su tiempo y suena una alarma en el celular. Las del grupo "Otras"
          aparecen dentro de la tarjeta Otras de la app. Desactiva una pausa para ocultarla sin borrarla de los
          informes.
        </p>
        <div className="editor-lista">
          <div className="editor-fila pausas encabezado">
            <span>Ícono</span>
            <span>Nombre</span>
            <span>Grupo</span>
            <span>Duración</span>
            <span>Activa</span>
            <span />
          </div>
          {pausas.map((p, i) => (
            <div key={p.id} className={`editor-fila pausas ${p.activo ? '' : 'inactiva'}`}>
              <div className="icono-pausa-sel">
                <span className="icono-pausa">
                  <Icono nombre={p.icono} />
                </span>
                <select value={p.icono} onChange={(e) => editar(i, { icono: e.target.value })} title="Ícono">
                  {ICONOS_PAUSA.map(([k, t]) => (
                    <option key={k} value={k}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={p.texto}
                placeholder="Nombre de la pausa"
                disabled={p.fija}
                onChange={(e) => editar(i, { texto: e.target.value })}
              />
              <select value={p.grupo} disabled={p.fija} onChange={(e) => editar(i, { grupo: e.target.value })}>
                <option value="principal">Tarjeta propia</option>
                <option value="otras">Dentro de "Otras"</option>
              </select>
              <div className="duracion">
                <input
                  type="number"
                  min={p.unidad === 'h' ? 0.5 : 1}
                  step={p.unidad === 'h' ? 0.5 : 5}
                  value={p.duracion}
                  onChange={(e) => editar(i, { duracion: e.target.value === '' ? '' : Number(e.target.value) })}
                />
                <select value={p.unidad} onChange={(e) => editar(i, { unidad: e.target.value })}>
                  <option value="min">min</option>
                  <option value="h">horas</option>
                </select>
              </div>
              <label className="interruptor">
                <input
                  type="checkbox"
                  checked={p.activo}
                  disabled={p.fija}
                  onChange={(e) => editar(i, { activo: e.target.checked })}
                />
                <span />
              </label>
              <button className="icono" disabled={p.fija} onClick={() => quitar(i)} title="Quitar">
                <FiX />
              </button>
            </div>
          ))}
          <button className="btn peq" onClick={agregar}>
            <FiPlus /> Agregar pausa
          </button>
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
                onChange={(e) => {
                  setCadaMin(e.target.value === '' ? '' : Number(e.target.value));
                  setGuardado(false);
                }}
              />
              <em>min{cadaMin >= 60 ? ` (${textoDuracion(cadaMin)})` : ''}</em>
            </div>
          </label>
        </div>

        {/* Así se verá en la pestaña Jornada de la app (mismo diseño de Indicadores diarios) */}
        <h3 className="subtitulo">Vista previa en la app</h3>
        <div className="vista-pausas">
          {principales.map((p) => (
            <div key={p.id} className="tarjeta-pausa">
              <span className="icono-pausa">
                <Icono nombre={p.icono} />
              </span>
              <strong>{textoDuracion(minutosDePausa(p) || 0)}</strong>
              <span>{p.texto || 'Sin nombre'}</span>
              <small>Toca para iniciar</small>
            </div>
          ))}
          {otras.length > 0 && (
            <div className="tarjeta-pausa">
              <span className="icono-pausa">
                <IoEllipsisHorizontalCircle />
              </span>
              <strong>{otras.length} tipos</strong>
              <span>Otras</span>
              <small>{otras.map((p) => p.texto || 'Sin nombre').join(', ')}</small>
            </div>
          )}
        </div>

        {errores.length > 0 && <div className="aviso error">{errores.join(' ')}</div>}
        <div className="barra">
          <button
            className="btn primario"
            disabled={errores.length > 0}
            onClick={() => {
              guardarParte({ tiposPausa: pausas, pausaActivaCadaMin: cadaMin });
              setGuardado(true);
            }}
          >
            <FiCheck /> Guardar pausas
          </button>
          <button
            className="btn"
            onClick={() => {
              setPausas(FORMULARIOS_DEFECTO.tiposPausa);
              setCadaMin(FORMULARIOS_DEFECTO.pausaActivaCadaMin);
              setGuardado(false);
            }}
          >
            <FiRotateCcw /> Valores por defecto
          </button>
          {guardado && <span className="chip ok">Guardado. La app las usará desde el próximo inicio de jornada.</span>}
        </div>
      </section>

      {/* Solo el administrador decide qué otros perfiles pueden configurar las pausas */}
      {esAdministrador && (
        <section className="panel">
          <h2>¿Quién más puede configurar las pausas?</h2>
          <p className="nota">
            El administrador siempre puede. Enciende el permiso "{PERMISOS_WEB['web.pausas.configurar'].texto}" a los
            perfiles que también deban hacerlo.
          </p>
          <div className="lista-permisos">
            {ROLES_CONFIGURABLES.map((r) => (
              <label key={r} className="fila-permiso">
                <span>{ROLES_WEB.find((x) => x.id === r).texto}</span>
                <span className="interruptor">
                  <input
                    type="checkbox"
                    checked={tiene(r, 'web.pausas.configurar')}
                    onChange={(e) => cambiarPermiso(r, 'web.pausas.configurar', e.target.checked)}
                  />
                  <span />
                </span>
              </label>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
