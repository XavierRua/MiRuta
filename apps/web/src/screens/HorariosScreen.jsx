import { FiPlus } from 'react-icons/fi';
import { api } from '../services/api';
export default function HorariosScreen() {
  const horarios = api.getHorarios();
  return (
    <div className="pagina">
      <div className="aviso">
        El rastreo se <strong>enciende y apaga automáticamente</strong> según estos horarios. Fuera de ellos la app no
        recoge ubicación (Ley 2191 de 2022, desconexión laboral). Las horas extra se autorizan como extensión de
        jornada.
      </div>
      <div className="barra">
        <button className="btn primario">
          <FiPlus /> Nuevo horario
        </button>
        <button className="btn">Autorizar horas extra</button>
        <button className="btn">Festivos de Colombia 2026</button>
      </div>
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Horario</th>
              <th>Franjas</th>
              <th>Aplica a</th>
              <th>Festivos</th>
            </tr>
          </thead>
          <tbody>
            {horarios.map((h) => (
              <tr key={h.nombre}>
                <td>
                  <strong>{h.nombre}</strong>
                </td>
                <td>{h.franjas}</td>
                <td>{h.aplicaA}</td>
                <td>{h.festivos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
