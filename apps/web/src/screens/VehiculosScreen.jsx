import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import FotoInput from '../components/FotoInput';
import Modal from '../components/Modal';
import { useEmpresa } from '../hooks/useEmpresa';
import { diasPara, formatoFecha } from '../utils/fechas';
function Vence({ fecha }) {
  const d = diasPara(fecha);
  const clase = d < 0 ? 'danger' : d <= 30 ? 'warn' : 'ok';
  const texto = d < 0 ? `Vencido hace ${-d} días` : d <= 30 ? `Vence en ${d} días` : formatoFecha(fecha);
  return <span className={`chip ${clase}`}>{texto}</span>;
}
export default function VehiculosScreen() {
  const [nuevo, setNuevo] = useState(false);
  const { vehiculos: lista } = useEmpresa();
  return (
    <div className="pagina">
      <div className="barra">
        <input className="buscar" placeholder="Buscar por placa o marca…" />
        <select>
          <option>Todos los tipos</option>
          <option>Moto</option>
          <option>Carro</option>
          <option>Camioneta</option>
        </select>
        <button className="btn primario" onClick={() => setNuevo(true)}>
          <FiPlus /> Nuevo vehículo
        </button>
      </div>

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Placa</th>
              <th>Tipo</th>
              <th>Marca / modelo</th>
              <th>Propietario</th>
              <th>Asignado a</th>
              <th>SOAT</th>
              <th>Técnico-mecánica</th>
              <th>Km del mes</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((v) => (
              <tr key={v.placa}>
                <td>
                  <span className="placa">{v.placa}</span>
                </td>
                <td>{v.tipo}</td>
                <td>
                  <strong>{v.marca}</strong>
                  <small className="bloque">
                    {v.modelo} · {v.cilindraje} cc · {v.color}
                  </small>
                </td>
                <td>
                  {v.propietario === 'Trabajador' ? (
                    <span className="chip info">Del trabajador · rodamiento</span>
                  ) : (
                    'Empresa'
                  )}
                </td>
                <td>{v.asignadoA ?? '—'}</td>
                <td>
                  <Vence fecha={v.soat} />
                </td>
                <td>
                  <Vence fecha={v.tecnomecanica} />
                </td>
                <td>{v.kmMes.toLocaleString('es-CO')} km</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {nuevo && (
        <Modal
          titulo="Registrar vehículo"
          onCerrar={() => setNuevo(false)}
          pie={
            <>
              <button className="btn" onClick={() => setNuevo(false)}>
                Cancelar
              </button>
              <button className="btn primario" onClick={() => setNuevo(false)}>
                Guardar vehículo
              </button>
            </>
          }
        >
          <h3>Fotos del vehículo</h3>
          <div className="fotos-vehiculo">
            <FotoInput texto="Frente" />
            <FotoInput texto="Lateral" />
            <FotoInput texto="Placa" />
            <FotoInput texto="Tarjeta de propiedad" />
          </div>

          <h3>Datos del vehículo</h3>
          <div className="grid-form">
            <label>
              Placa
              <input placeholder="ABC12F" />
            </label>
            <label>
              Tipo
              <select>
                <option>Moto</option>
                <option>Carro</option>
                <option>Camioneta</option>
                <option>Camión</option>
              </select>
            </label>
            <label>
              Marca
              <input />
            </label>
            <label>
              Línea
              <input />
            </label>
            <label>
              Modelo (año)
              <input type="number" />
            </label>
            <label>
              Color
              <input />
            </label>
            <label>
              Cilindraje (cc)
              <input type="number" />
            </label>
            <label>
              Propietario
              <select>
                <option>Empresa</option>
                <option>Trabajador (paga rodamiento)</option>
              </select>
            </label>
          </div>

          <h3>Documentos</h3>
          <div className="grid-form">
            <label>
              SOAT · vencimiento
              <input type="date" />
            </label>
            <label>
              Técnico-mecánica · vencimiento
              <input type="date" />
            </label>
            <label>
              N.º tarjeta de propiedad
              <input />
            </label>
            <label>
              Asignar a
              <select>
                <option>Sin asignar</option>
                <option>Carlos Restrepo</option>
                <option>Andrés Gómez</option>
              </select>
            </label>
          </div>
          <div className="aviso">Se generará una alerta 30 días antes de que venza cada documento.</div>
        </Modal>
      )}
    </div>
  );
}
