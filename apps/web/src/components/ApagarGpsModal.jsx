import { useState } from 'react';
import { FiPower } from 'react-icons/fi';
import Modal from './Modal';

// Apagar el GPS de un trabajador (administrador, supervisor y SST, según permisos).
// El comentario es obligatorio; queda quién lo apagó, a qué hora y por qué. Se cierra su jornada y se
// detienen los recordatorios de reportes en su celular.
export default function ApagarGpsModal({ trabajador, usuario, onConfirmar, onCerrar }) {
  const [motivo, setMotivo] = useState('');
  const valido = motivo.trim().length >= 15;
  return (
    <Modal
      titulo={`Apagar GPS de ${trabajador.nombres} ${trabajador.apellidos}`}
      onCerrar={onCerrar}
      pie={
        <>
          {!valido && <span className="nota falta">El comentario es obligatorio (mínimo 15 letras).</span>}
          <button className="btn" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            className="btn peligro"
            disabled={!valido}
            onClick={() =>
              onConfirmar({
                trabajadorId: trabajador.id,
                por: `${usuario.nombre} (${usuario.rol})`,
                motivo: motivo.trim(),
              })
            }
          >
            <FiPower /> Apagar GPS y cerrar jornada
          </button>
        </>
      }
    >
      <p className="nota">
        Úsalo después de comunicarte con el trabajador y verificar la novedad (salud o incidente). Se cerrará su
        jornada, se apagará su GPS y se detendrán sus recordatorios de reportes. Quedará registrado quién lo apagó, a
        qué hora y por qué.
      </p>
      <label className="campo-bloque">
        Comentario (obligatorio)
        <textarea
          rows={4}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej.: Se habló por teléfono a las 10:20; presenta fiebre. Se remite a la EPS."
        />
      </label>
    </Modal>
  );
}
