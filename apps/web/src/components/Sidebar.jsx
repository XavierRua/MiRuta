import { FiChevronDown, FiLogOut } from 'react-icons/fi';
import { useSesion } from '../context/SesionContext';
import { menu } from '../navigation/menu';
import { api } from '../services/api';
import { useConfig } from '../context/ConfigContext';

export default function Sidebar() {
  const { usuario, salir, empresaId, setEmpresaId, pantalla, irA } = useSesion();
  const { indicadores } = useConfig();
  const abiertas = api.getAlertas(indicadores.limiteVelocidad).filter((a) => a.estado === 'abierta').length;

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

      <nav>
        {menu.map(({ id, texto, Icono }) => (
          <button key={id} className={pantalla === id ? 'activo' : ''} onClick={() => irA(id)}>
            <Icono />
            <span>{texto}</span>
            {id === 'alertas' && abiertas > 0 && <em className="contador">{abiertas}</em>}
          </button>
        ))}
      </nav>

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
