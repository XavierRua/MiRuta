import { useSesion } from '../context/SesionContext';

export default function LoginScreen() {
  const { entrar } = useSesion();
  return (
    <div className="login">
      <div className="login-tarjeta">
        <div className="logo grande">
          <span className="logo-icono">◉</span> MiRuta
        </div>
        <p className="sub">Monitoreo de trabajadores en campo</p>
        <label>
          Correo
          <input type="email" placeholder="admin@empresa.com" defaultValue="admin@demo.com" />
        </label>
        <label>
          Contraseña
          <input type="password" defaultValue="demo1234" />
        </label>
        <button className="btn primario ancho" onClick={entrar}>
          Entrar (demo)
        </button>
        <small className="nota">Prototipo con datos de ejemplo. Aún no se conecta a Supabase.</small>
      </div>
    </div>
  );
}
