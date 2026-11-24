import { useState } from 'react';
import Modal from './Modal';
import { aTextoFecha } from '../utils/fechas';

// Excluir horas de reporte (por ejemplo, una capacitación): esas horas no se piden ni cuentan para la eficiencia
export default function ExcluirHorasModal({ trabajadores, onGuardar, onCerrar }) {
  const [sel, setSel] = useState([]);
  const [fecha, setFecha] = useState(aTextoFecha(new Date()));
  const [desde, setDesde] = useState('14:00');
  const [hasta, setHasta] = useState('16:00');
  const [motivo, setMotivo] = useState('Capacitación');
  const errores = [
    sel.length === 0 && 'al menos un trabajador',
    !(desde < hasta) && 'una hora final mayor que la inicial',
    !motivo.trim() && 'el motivo',
  ].filter(Boolean);
  return (
    <Modal
      titulo="Excluir horas de reporte"
      onCerrar={onCerrar}
      pie={
        <>
          {errores.length > 0 && <span className="nota falta">Falta: {errores.join(', ')}.</span>}
          <button className="btn" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            className="btn primario"
            disabled={errores.length > 0}
            onClick={() => onGuardar({ trabajadores: sel, fecha, desde, hasta, motivo: motivo.trim() })}
          >
            Guardar
          </button>
        </>
      }
    >
      <p className="nota">
        Durante estas horas el trabajador no tendrá que enviar reportes de actividad y no le contarán como "No reportó"
        ni bajarán su eficiencia. Ejemplo: una capacitación de 2:00 a 4:00 p. m.
      </p>
      <h3>Trabajadores</h3>
      <div className="chips-seleccion">
        <button
          className={`chip-sel ${sel.length === trabajadores.length ? 'sel' : ''}`}
          onClick={() => setSel(sel.length === trabajadores.length ? [] : trabajadores.map((t) => t.id))}
        >
          Todos
        </button>
        {trabajadores.map((t) => {
          const s = sel.includes(t.id);
          return (
            <button
              key={t.id}
              className={`chip-sel ${s ? 'sel' : ''}`}
              onClick={() => setSel(s ? sel.filter((x) => x !== t.id) : [...sel, t.id])}
            >
              {t.nombres} {t.apellidos}
            </button>
          );
        })}
      </div>
      <div className="grid-form">
        <label>
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label>
          Motivo
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </label>
        <label>
          Desde
          <input type="time" step={3600} value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="time" step={3600} value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}
