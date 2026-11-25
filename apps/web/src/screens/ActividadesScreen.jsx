import { useMemo, useState } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import { IconoPausa } from '../components/ConfigPausas';
import { textoDuracion } from '../config/formularios';
import { useNovedades } from '../context/NovedadesContext';
import { useSesion } from '../context/SesionContext';
import { useEmpresa } from '../hooks/useEmpresa';
import { aTextoFecha } from '../utils/fechas';

const sumarDias = (texto, n) => {
  const d = new Date(`${texto}T00:00`);
  d.setDate(d.getDate() + n);
  return aTextoFecha(d);
};
const fechaLarga = (t) =>
  new Date(`${t}T00:00`).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });

// Actividades autorizadas (permiso web.actividades.autorizar): capacitación, reunión, cita médica, diligencia…
// Se habilitan a uno o varios trabajadores para una fecha. Solo ese día le aparecen en la app (con una
// notificación con sonido). Tiempo libre = cronómetro y la termina el trabajador; tiempo asignado = alarma y
// cierre automático. Mientras dure, su reporte de actividad se extiende igual que con una pausa.
export default function ActividadesScreen() {
  const { trabajadores } = useEmpresa();
  const { usuario } = useSesion();
  const { formularios, actividades, autorizarActividad, cancelarActividad } = useNovedades();
  const hoy = aTextoFecha(new Date());
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(sumarDias(hoy, 14));
  const [nueva, setNueva] = useState(false);
  const quien = `${usuario.nombre} (${usuario.rol})`;
  const persona = (id) => trabajadores.find((t) => t.id === id);

  const lista = useMemo(
    () =>
      actividades
        .filter((a) => persona(a.trabajadorId) && a.fecha >= desde && a.fecha <= hasta)
        .sort(
          (a, b) =>
            a.fecha.localeCompare(b.fecha) ||
            (persona(a.trabajadorId)?.nombres ?? '').localeCompare(persona(b.trabajadorId)?.nombres ?? ''),
        ),
    [actividades, desde, hasta, trabajadores],
  );
  const activas = lista.filter((a) => a.estado === 'habilitada');

  return (
    <div className="pagina">
      <div className="barra">
        <label className="campo-fecha">
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label className="campo-fecha">
          Hasta
          <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <button className="btn primario" onClick={() => setNueva(true)}>
          <FiPlus /> Habilitar actividad
        </button>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span>Habilitadas en el período</span>
          <strong>{activas.length}</strong>
        </div>
        <div className="kpi">
          <span>Para hoy</span>
          <strong>{activas.filter((a) => a.fecha === hoy).length}</strong>
        </div>
        <div className="kpi">
          <span>Con tiempo asignado</span>
          <strong>{activas.filter((a) => a.modo === 'asignado').length}</strong>
        </div>
        <div className="kpi">
          <span>Canceladas</span>
          <strong>{lista.length - activas.length}</strong>
        </div>
      </div>

      <section className="panel">
        <h2>Actividades habilitadas ({lista.length})</h2>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Trabajador</th>
                <th>Actividad</th>
                <th>Control del tiempo</th>
                <th>Autorizó</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => {
                const t = persona(a.trabajadorId);
                return (
                  <tr key={a.id} className={a.estado === 'cancelada' ? 'fila-apagada' : ''}>
                    <td>
                      <strong>{fechaLarga(a.fecha)}</strong>
                      {a.fecha === hoy && <small className="bloque">Hoy</small>}
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
                      <div className="celda-persona">
                        <span className="icono-pausa">
                          <IconoPausa nombre={a.icono} />
                        </span>
                        <span>
                          {a.texto}
                          {a.nota && <small className="bloque">{a.nota}</small>}
                        </span>
                      </div>
                    </td>
                    <td>
                      {a.modo === 'asignado'
                        ? `Tiempo asignado: ${textoDuracion(a.minutos)}`
                        : 'Tiempo libre (cronómetro)'}
                    </td>
                    <td>
                      {a.autorizadaPor}
                      <small className="bloque">
                        {new Date(a.creadaEn).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                      </small>
                    </td>
                    <td>
                      {a.estado === 'cancelada' ? (
                        <span className="chip muted" title={`Canceló ${a.canceladaPor}`}>
                          Cancelada
                        </span>
                      ) : a.fecha < hoy ? (
                        <span className="chip info">Fecha pasada</span>
                      ) : (
                        <span className="chip morado">Habilitada</span>
                      )}
                    </td>
                    <td>
                      {a.estado === 'habilitada' && a.fecha >= hoy && (
                        <button className="btn peq" onClick={() => cancelarActividad(a.id, quien)}>
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={7} className="vacio">
                    No hay actividades habilitadas en estas fechas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <small className="nota">
          El registro de lo que hizo el trabajador (hora de inicio, fin y duración) está en Novedades y ausentismo →
          Pausas y actividades.
        </small>
      </section>

      {nueva && (
        <NuevaActividad
          trabajadores={trabajadores}
          tipos={formularios.tiposActividad}
          hoy={hoy}
          onCerrar={() => setNueva(false)}
          onGuardar={(datos) => {
            datos.trabajadores.forEach((id) => {
              const { trabajadores: _, ...resto } = datos;
              autorizarActividad({ ...resto, trabajadorId: id, autorizadaPor: quien });
            });
            setNueva(false);
          }}
        />
      )}
    </div>
  );
}

function NuevaActividad({ trabajadores, tipos, hoy, onCerrar, onGuardar }) {
  const [elegidos, setElegidos] = useState([]);
  const [fecha, setFecha] = useState(hoy);
  const [tipoId, setTipoId] = useState(tipos[0]?.id ?? '');
  const [modo, setModo] = useState('asignado');
  const [duracion, setDuracion] = useState(1);
  const [unidad, setUnidad] = useState('h');
  const [nota, setNota] = useState('');
  const tipo = tipos.find((t) => t.id === tipoId);
  const minutos = unidad === 'h' ? Math.round(duracion * 60) : Number(duracion);

  const errores = [
    !elegidos.length && 'Elige al menos un trabajador.',
    !tipo && 'Elige el tipo de actividad.',
    fecha < hoy && 'La fecha no puede ser anterior a hoy.',
    modo === 'asignado' &&
      !(minutos > 0 && minutos <= 600) &&
      'El tiempo asignado debe estar entre 1 minuto y 10 horas.',
  ].filter(Boolean);

  const alternar = (id) => setElegidos(elegidos.includes(id) ? elegidos.filter((x) => x !== id) : [...elegidos, id]);

  return (
    <Modal
      titulo="Habilitar actividad autorizada"
      onCerrar={onCerrar}
      pie={
        <>
          <button className="btn" onClick={onCerrar}>
            <FiX /> Cancelar
          </button>
          <button
            className="btn primario"
            disabled={errores.length > 0}
            onClick={() =>
              onGuardar({
                trabajadores: elegidos,
                fecha,
                tipo: tipo.id,
                texto: tipo.texto,
                icono: tipo.icono,
                modo,
                minutos: modo === 'asignado' ? minutos : null,
                nota: nota.trim(),
              })
            }
          >
            Habilitar y avisar al trabajador
          </button>
        </>
      }
    >
      <div className="form-actividad">
        <label>
          <span>Trabajadores</span>
          <div className="chips-seleccion">
            <button
              className={`chip-sel ${elegidos.length === trabajadores.length ? 'sel' : ''}`}
              onClick={() => setElegidos(elegidos.length === trabajadores.length ? [] : trabajadores.map((t) => t.id))}
            >
              Todos
            </button>
            {trabajadores.map((t) => (
              <button
                key={t.id}
                className={`chip-sel ${elegidos.includes(t.id) ? 'sel' : ''}`}
                onClick={() => alternar(t.id)}
              >
                <Avatar nombres={t.nombres} apellidos={t.apellidos} foto={t.foto} tam={24} />
                {t.nombres} {t.apellidos}
              </button>
            ))}
          </div>
        </label>

        <div className="fila-form">
          <label>
            <span>Fecha</span>
            <input type="date" value={fecha} min={hoy} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <label>
            <span>Actividad</span>
            <select value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.texto}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span>Control del tiempo</span>
          <div className="segmentos">
            <button className={modo === 'asignado' ? 'activo' : ''} onClick={() => setModo('asignado')}>
              Tiempo asignado
            </button>
            <button className={modo === 'libre' ? 'activo' : ''} onClick={() => setModo('libre')}>
              Tiempo libre
            </button>
          </div>
          <small className="nota">
            {modo === 'asignado'
              ? 'Al cumplirse el tiempo suena una alarma y se cierra sola.'
              : 'Corre un cronómetro; el trabajador la finaliza cuando termine.'}
          </small>
        </label>

        {modo === 'asignado' && (
          <label>
            <span>Duración</span>
            <div className="duracion">
              <input
                type="number"
                min={unidad === 'h' ? 0.5 : 5}
                step={unidad === 'h' ? 0.5 : 5}
                value={duracion}
                onChange={(e) => setDuracion(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
                <option value="min">min</option>
                <option value="h">horas</option>
              </select>
            </div>
          </label>
        )}

        <label>
          <span>Nota para el trabajador (opcional)</span>
          <input
            value={nota}
            maxLength={120}
            placeholder="Ej.: Trabajo seguro en alturas, sala 2"
            onChange={(e) => setNota(e.target.value)}
          />
        </label>

        {errores.length > 0 && <div className="aviso error">{errores.join(' ')}</div>}
      </div>
    </Modal>
  );
}
