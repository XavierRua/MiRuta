import { useRef, useState } from 'react';
import { FiBell, FiMenu, FiTrash2, FiUpload } from 'react-icons/fi';
import { useConfig } from '../context/ConfigContext';
import { useSesion } from '../context/SesionContext';
import { api } from '../services/api';

const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_KB = 1024;

// Logo de la empresa: se ve arriba en todas las pestañas de la app del trabajador.
// Lo sube o cambia el administrador (permiso web.empresa.logo). Sin logo, la app muestra el de MiRuta.
export default function ConfigLogo() {
  const { empresaId } = useSesion();
  const { logos, guardarLogo } = useConfig();
  const logo = logos[empresaId];
  const empresa = api.getEmpresas().find((e) => e.id === empresaId);
  const [error, setError] = useState(null);
  const input = useRef(null);

  const elegir = (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!TIPOS.includes(archivo.type)) return setError('El logo debe ser una imagen PNG, JPG, WEBP o SVG.');
    if (archivo.size > MAX_KB * 1024) return setError('El logo pesa más de 1 MB. Usa una imagen más liviana.');
    const lector = new FileReader();
    lector.onload = () => {
      setError(null);
      guardarLogo(empresaId, lector.result);
    };
    lector.readAsDataURL(archivo);
  };

  return (
    <section className="panel">
      <h2>Logo de {empresa?.nombre ?? 'la empresa'}</h2>
      <p className="nota">
        Aparece arriba en todas las pestañas de la app de los trabajadores de esta empresa. Usa una imagen horizontal,
        con fondo transparente o blanco (PNG recomendado, por ejemplo 600 × 150 px, máximo 1 MB).
      </p>

      <div className="logo-config">
        {/* Vista previa del encabezado de la app */}
        <div className="celular-encabezado">
          <FiMenu />
          <div className="celular-logo">
            {logo ? (
              <img src={logo} alt={`Logo de ${empresa?.nombre ?? 'la empresa'}`} />
            ) : (
              <span className="logo-miruta">
                <b>◉</b> MiRuta
              </span>
            )}
          </div>
          <span className="celular-campana">
            <FiBell />
            <em>3</em>
          </span>
        </div>
        <small className="nota">
          {logo ? 'Así se verá en la app.' : 'Esta empresa no tiene logo: la app muestra el de MiRuta.'}
        </small>

        <div className="barra">
          <input ref={input} type="file" accept={TIPOS.join(',')} hidden onChange={elegir} />
          <button className="btn primario" onClick={() => input.current.click()}>
            <FiUpload /> {logo ? 'Cambiar logo' : 'Subir logo'}
          </button>
          {logo && (
            <button className="btn" onClick={() => guardarLogo(empresaId, null)}>
              <FiTrash2 /> Quitar logo (usar el de MiRuta)
            </button>
          )}
        </div>
        {error && <div className="aviso error">{error}</div>}
      </div>
    </section>
  );
}
