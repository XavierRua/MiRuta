import { FiAlertTriangle, FiLock, FiLogIn, FiLogOut } from 'react-icons/fi';
import Modal from './Modal';
import MapaRecorrido from './MapaRecorrido';
import { ESTADOS_VISITA, TIPOS, textoPermanencia } from '../utils/visitas';
import { infoModo, textoMin } from '../utils/desplazamiento';

// Detalle de una visita para el administrador: entradas, salidas, tiempo dentro, alertas y recorrido
export default function VisitaDetalleModal({ visita: v, trabajador, tolerancia, onCerrar }) {
  return (
    <Modal titulo={`${TIPOS[v.tipo].texto}: ${v.titulo}`} onCerrar={onCerrar}>
      <div className="detalle-visita">
        <p className="nota">
          {trabajador.nombres} {trabajador.apellidos} ·{' '}
          {v.fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} · estimada{' '}
          {v.horaEstimada} ·{' '}
          <span className={`chip ${ESTADOS_VISITA[v.estado].clase}`}>{ESTADOS_VISITA[v.estado].texto}</span>
        </p>

        {v.periodos.length > 0 ? (
          <table className="tabla-periodos">
            <thead>
              <tr>
                <th>#</th>
                <th>
                  <FiLogIn /> Entrada
                </th>
                <th>
                  <FiLogOut /> Salida
                </th>
                <th>Tiempo dentro</th>
                <th>Entró / salió</th>
              </tr>
            </thead>
            <tbody>
              {v.periodos.map((x, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{x.entrada}</td>
                  <td>{x.salida ?? <span className="chip info">Dentro</span>}</td>
                  <td>{textoPermanencia(x.minutos)}</td>
                  <td>
                    {[x.modoEntrada, x.modoSalida]
                      .map((m) =>
                        m
                          ? `${infoModo(m, trabajador.vehiculoTipo)?.emoji} ${infoModo(m, trabajador.vehiculoTipo)?.texto.toLowerCase()}`
                          : '—',
                      )
                      .join(' / ')}
                  </td>
                </tr>
              ))}
              <tr className="total">
                <td colSpan={3}>
                  Total del día ({v.periodos.length} {v.periodos.length === 1 ? 'entrada' : 'entradas'})
                </td>
                <td>{textoPermanencia(v.permanenciaMin)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        ) : v.tipo === 'ruta' ? (
          <p>
            Llegada {v.llegada ?? '—'} · salida {v.salida ?? '—'} · {v.puntosVisitados} de {v.puntosTotal} puntos
          </p>
        ) : (
          <p className="nota">No entró a la geocerca este día.</p>
        )}

        {v.tiempos && (
          <div className="modos-geocerca">
            {['a_pie', 'vehiculo', 'quieto'].map((k) => {
              const m = infoModo(k, trabajador.vehiculoTipo);
              return (
                <span key={k} className="chip" style={{ color: m.color }}>
                  {m.emoji} {m.texto}: {textoMin(v.tiempos[k])}
                </span>
              );
            })}
            <small className="nota">Tiempo dentro de la geocerca según cómo se desplazaba.</small>
          </div>
        )}

        {v.alertasSalida.map((a, i) => (
          <div key={i} className="aviso error">
            <FiAlertTriangle /> Salió del área asignada a las {a.hora} ·{' '}
            <a
              href={`https://www.openstreetmap.org/?mlat=${a.lat}&mlon=${a.lng}#map=18/${a.lat}/${a.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              {a.lat.toFixed(5)}, {a.lng.toFixed(5)}
            </a>
          </div>
        ))}

        {v.tipo !== 'ruta' && v.recorrido.length > 0 && <MapaRecorrido visita={v} />}
        <small className="nota">
          <FiLock /> Registro automático por GPS (el trabajador no lo puede modificar). La salida se confirma tras{' '}
          {tolerancia} min fuera de la geocerca. Mapa: línea verde punteada = a pie, azul = en vehículo; puntos verdes =
          entradas, rojos = salidas.
        </small>
      </div>
    </Modal>
  );
}
