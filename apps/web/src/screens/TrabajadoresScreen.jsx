import { useState } from 'react';
import { FiPlus, FiCheckCircle, FiAlertCircle, FiSmartphone } from 'react-icons/fi';
import CelularModal from '../components/CelularModal';
import Avatar from '../components/Avatar';
import FotoInput from '../components/FotoInput';
import Modal from '../components/Modal';
import { estadoInfo } from '../constants/estados';
import { useEmpresa } from '../hooks/useEmpresa';
export default function TrabajadoresScreen() {
  const [nuevo, setNuevo] = useState(false);
  const [celularDe, setCelularDe] = useState(null);
  const { trabajadores: lista, vehiculos } = useEmpresa();
  return (
    <div className="pagina">
      <div className="barra">
        <input className="buscar" placeholder="Buscar por nombre, cédula o placa…" />
        <select>
          <option>Todos los grupos</option>
          <option>Zona Centro</option>
          <option>Zona Norte</option>
          <option>Zona Sur</option>
        </select>
        <button className="btn primario" onClick={() => setNuevo(true)}>
          <FiPlus /> Nuevo trabajador
        </button>
      </div>

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Trabajador</th>
              <th>Cédula</th>
              <th>Cargo</th>
              <th>Grupo</th>
              <th>Vehículo</th>
              <th>Horario</th>
              <th>Autorización</th>
              <th>Celular</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((t) => (
              <tr key={t.id}>
                <td>
                  <div className="celda-persona">
                    <Avatar nombres={t.nombres} apellidos={t.apellidos} foto={t.foto} tam={36} />
                    <div>
                      <strong>
                        {t.nombres} {t.apellidos}
                      </strong>
                      <small>{t.telefono}</small>
                    </div>
                  </div>
                </td>
                <td>{t.cedula}</td>
                <td>{t.cargo}</td>
                <td>{t.grupo}</td>
                <td>{t.vehiculoPlaca ?? '—'}</td>
                <td>
                  <small>{t.horario}</small>
                </td>
                <td>
                  {t.consentimiento ? (
                    <span className="chip ok">
                      <FiCheckCircle /> Firmada v1.1
                    </span>
                  ) : (
                    <span className="chip warn">
                      <FiAlertCircle /> Pendiente
                    </span>
                  )}
                </td>
                <td>
                  <button className="celda-celular" onClick={() => setCelularDe(t)} title="Gestionar celular">
                    <FiSmartphone />
                    {t.celular ? (
                      <span>
                        {t.celular.modelo}
                        <small className="bloque">
                          desde {new Date(t.celular.vinculadoEn + 'T00:00').toLocaleDateString('es-CO')}
                        </small>
                      </span>
                    ) : (
                      <span className="chip warn">Sin activar</span>
                    )}
                  </button>
                </td>
                <td>
                  <span className={`chip ${estadoInfo[t.estado].clase}`}>{estadoInfo[t.estado].texto}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {celularDe && <CelularModal trabajador={celularDe} onCerrar={() => setCelularDe(null)} />}

      {nuevo && (
        <Modal
          titulo="Registrar trabajador"
          onCerrar={() => setNuevo(false)}
          pie={
            <>
              <button className="btn" onClick={() => setNuevo(false)}>
                Cancelar
              </button>
              <button className="btn primario" onClick={() => setNuevo(false)}>
                Guardar trabajador
              </button>
            </>
          }
        >
          <div className="form-foto">
            <FotoInput texto="Foto del trabajador" redonda />
            <p className="nota">
              La foto solo se usa para identificar al trabajador. No se aplica reconocimiento facial.
            </p>
          </div>

          <h3>Datos personales</h3>
          <div className="grid-form">
            <label>
              Nombres
              <input />
            </label>
            <label>
              Apellidos
              <input />
            </label>
            <label>
              Cédula
              <input />
            </label>
            <label>
              Fecha de nacimiento
              <input type="date" />
            </label>
            <label>
              Teléfono
              <input />
            </label>
            <label>
              Correo
              <input type="email" />
            </label>
            <label className="col2">
              Dirección
              <input />
            </label>
          </div>

          <h3>Datos laborales</h3>
          <div className="grid-form">
            <label>
              Cargo
              <input />
            </label>
            <label>
              Fecha de ingreso
              <input type="date" />
            </label>
            <label>
              Grupo
              <select>
                <option>Zona Centro</option>
                <option>Zona Norte</option>
                <option>Zona Sur</option>
              </select>
            </label>
            <label>
              Horario
              <select>
                <option>Diurno lunes a sábado</option>
                <option>Diurno lunes a viernes</option>
                <option>Turno tarde</option>
                <option>Fin de semana</option>
              </select>
            </label>
            <label>
              Vehículo asignado
              <select>
                <option>Sin vehículo</option>
                {vehiculos.map((v) => (
                  <option key={v.placa}>
                    {v.placa} · {v.marca}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rol en la plataforma
              <select>
                <option>Trabajador</option>
                <option>Supervisor</option>
                <option>Administrador</option>
              </select>
            </label>
          </div>

          <h3>Salud y emergencia</h3>
          <div className="grid-form">
            <label>
              EPS
              <input />
            </label>
            <label>
              ARL
              <input />
            </label>
            <label>
              Tipo de sangre
              <select>
                <option>O+</option>
                <option>O-</option>
                <option>A+</option>
                <option>A-</option>
                <option>B+</option>
                <option>B-</option>
                <option>AB+</option>
                <option>AB-</option>
              </select>
            </label>
            <label>
              Contacto de emergencia
              <input placeholder="Nombre" />
            </label>
            <label>
              Teléfono de emergencia
              <input />
            </label>
          </div>

          <h3>Licencia de conducción</h3>
          <div className="grid-form">
            <label>
              Categoría
              <select>
                <option>A2 (moto)</option>
                <option>B1</option>
                <option>C1</option>
              </select>
            </label>
            <label>
              Vencimiento
              <input type="date" />
            </label>
          </div>

          <div className="aviso">
            Al primer ingreso a la app, el trabajador deberá aceptar la autorización de tratamiento de datos y
            geolocalización (Ley 1581 de 2012). El rastreo se activa automáticamente solo dentro de su horario.
          </div>
        </Modal>
      )}
    </div>
  );
}
