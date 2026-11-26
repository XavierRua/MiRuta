import { FiChevronDown, FiLogOut } from 'react-icons/fi';
import { useSesion } from '../context/SesionContext';
import { menu } from '../navigation/menu';
import { api } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { usePermisos } from '../context/PermisosContext';
import { ROLES_WEB } from '../config/permisos';

export default function Sidebar() {
  const { usuario, salir, empresaId, setEmpresaId, pantalla, irA, cambiarPerfilDemo } = useSesion();
  const { indicadores, logos } = useConfig();
  const { puede } = usePermisos();
  // Cada opción del menú puede pedir uno o varios permisos (basta con tener uno)
  const visibles = menu.filter((m) => !m.permisos || m.permisos.some(puede));
  const PERMISO_ALERTA = { llegada_tarde: 'web.alertas.llegadaTarde', bateria_baja: 'web.alertas.bateriaBaja' };
  const abiertas = api
    .getAlertas(indicadores.limiteVelocidad)
    .filter((a) => a.estado === 'abierta' && (!PERMISO_ALERTA[a.tipo] || puede(PERMISO_ALERTA[a.tipo]))).length;

  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="logo-icono">◉</span> MiRuta
      </div>

      <label className="empresa-selector">
        <span>Empresa</span>
        <div className="select-wrap">
          <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            {api.getEmpresas().map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
          <FiChevronDown />
        </div>
      </label>

      {/* Logo de la empresa seleccionada (el mismo que ve el trabajador en la app) */}
      {logos[empresaId] && (
        <div className="logo-empresa-sidebar">
          <img src={logos[empresaId]} alt="Logo de la empresa" />
        </div>
      )}

      <nav>
        {visibles.map(({ id, texto, Icono }) => (
          <button key={id} className={pantalla === id ? 'activo' : ''} onClick={() => irA(id)}>
            <Icono />
            <span>{texto}</span>
            {id === 'alertas' && abiertas > 0 && <em className="contador">{abiertas}</em>}
          </button>
        ))}
      </nav>

      {/* Demo: probar el panel con los permisos de otro perfil */}
      <label className="empresa-selector perfil-demo">
        <span>Ver como (demo)</span>
        <div className="select-wrap">
          <select
            value={usuario.rolClave}
            onChange={(e) => {
              cambiarPerfilDemo(e.target.value);
              irA('mapa');
            }}
          >
            {ROLES_WEB.map((r) => (
              <option key={r.id} value={r.id}>
                {r.texto}
              </option>
            ))}
          </select>
          <FiChevronDown />
        </div>
      </label>

      <div className="usuario">
        <div className="avatar">{usuario.iniciales}</div>
        <div>
          <strong>{usuario.nombre}</strong>
          <small>{usuario.rol}</small>
        </div>
        <button className="icono" title="Salir" onClick={salir}>
          <FiLogOut />
        </button>
      </div>
    </aside>
  );
}
