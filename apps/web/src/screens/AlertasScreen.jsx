import { usePermisos } from '../context/PermisosContext';
import { useState } from 'react';
import { alertaInfo as info } from '../constants/alertas';
import { api } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { useProgramacion } from '../context/ProgramacionContext';
import { useEmpresa } from '../hooks/useEmpresa';
import { generarVisitas } from '../utils/visitas';
const filtros = ['Todas', 'Abiertas', 'Vistas', 'Cerradas'];
export default function AlertasScreen() {
  const { indicadores } = useConfig();
  const { programaciones } = useProgramacion();
  const { trabajadores } = useEmpresa();
  // Salidas del área asignada de hoy (con GPS real las crea el servidor, ver 0009)
  const hoy = new Date();
  const salidas = generarVisitas(
    programaciones,
    trabajadores.map((t) => t.id),
    hoy,
    hoy,
  ).flatMap((v) => {
    const t = trabajadores.find((x) => x.id === v.trabajadorId);
    return v.alertasSalida.map((a, i) => ({
      id: `sal-${v.id}-${i}`,
      tipo: 'salida_area',
      trabajador: `${t.nombres} ${t.apellidos}`,
      mensaje: `Salió de "${v.titulo}" (su única visita de hoy) a las ${a.hora} · ${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}`,
      hora: a.hora,
      estado: 'abierta',
    }));
  });
  // Las alertas de llegada tarde y batería baja solo las ven los perfiles con ese permiso
  const { puede } = usePermisos();
  const PERMISO_ALERTA = { llegada_tarde: 'web.alertas.llegadaTarde', bateria_baja: 'web.alertas.bateriaBaja' };
  const alertas = [...salidas, ...api.getAlertas(indicadores.limiteVelocidad)]
    .filter((a) => !PERMISO_ALERTA[a.tipo] || puede(PERMISO_ALERTA[a.tipo]))
    .sort((a, b) => b.hora.padStart(5, '0').localeCompare(a.hora.padStart(5, '0')));
  const [filtro, setFiltro] = useState('Abiertas');
  const mapa = { Todas: null, Abiertas: 'abierta', Vistas: 'vista', Cerradas: 'cerrada' };
  const lista = alertas.filter((a) => !mapa[filtro] || a.estado === mapa[filtro]);
  return (
    <div className="pagina">
      <div className="barra">
        <div className="segmentos">
          {filtros.map((f) => (
            <button key={f} className={f === filtro ? 'activo' : ''} onClick={() => setFiltro(f)}>
              {f}
            </button>
          ))}
        </div>
        <select>
          <option>Todos los tipos</option>
          {Object.values(info).map((i) => (
            <option key={i.texto}>{i.texto}</option>
          ))}
        </select>
      </div>

      <section className="panel">
        <ul className="lista-alertas">
          {lista.map((a) => (
            <li key={a.id}>
              <span className={`alerta-icono ${info[a.tipo].clase}`}>{info[a.tipo].icono}</span>
              <div className="datos">
                <strong>
                  {info[a.tipo].texto} · {a.trabajador}
                </strong>
                <small>{a.mensaje}</small>
              </div>
              <span className="hora">{a.hora}</span>
              <span className={`chip ${a.estado === 'abierta' ? 'danger' : a.estado === 'vista' ? 'info' : 'muted'}`}>
                {a.estado}
              </span>
              {a.estado !== 'cerrada' && <button className="btn peq">Atender</button>}
            </li>
          ))}
          {lista.length === 0 && <li className="vacio">No hay alertas en este filtro.</li>}
        </ul>
      </section>
      <small className="nota">
        "Apagado por la persona" es una inferencia: se basa en el aviso de apagado de Android y el nivel de batería.
      </small>
    </div>
  );
}
