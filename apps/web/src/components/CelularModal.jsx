import { useState } from 'react';
import { FiCopy, FiKey, FiSmartphone, FiTrash2 } from 'react-icons/fi';
import Modal from './Modal';

// Código de 6 dígitos de un solo uso.
// Con Supabase lo genera el servidor, guarda solo su huella y vence en 24 horas.
function generarCodigo() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, '0');
}

// Gestión del celular vinculado de un trabajador: generar código de activación o desvincular
export default function CelularModal({ trabajador: t, onCerrar }) {
  const [celular, setCelular] = useState(t.celular);
  const [codigo, setCodigo] = useState(null);
  const [confirmar, setConfirmar] = useState(false);

  return (
    <Modal titulo={`Celular de ${t.nombres} ${t.apellidos}`} onCerrar={onCerrar}>
      <div className="celular-actual">
        <FiSmartphone />
        {celular ? (
          <div>
            <strong>{celular.modelo}</strong>
            <small className="bloque">
              {celular.sistema} · vinculado desde {new Date(celular.vinculadoEn + 'T00:00').toLocaleDateString('es-CO')}
            </small>
          </div>
        ) : (
          <div>
            <strong>Sin celular vinculado</strong>
            <small className="bloque">El trabajador aún no ha activado la app.</small>
          </div>
        )}
      </div>

      <p className="nota">
        Cada trabajador solo puede usar MiRuta en un celular. Si intenta entrar desde otro, la app lo rechaza y te llega
        una alerta. El trabajador entra con un PIN personal; no se usa su rostro ni su huella.
      </p>

      {codigo ? (
        <div className="codigo-activacion">
          <span>Código de activación</span>
          <strong>{codigo}</strong>
          <small>
            Vence en 24 horas y sirve una sola vez. Al usarlo,{' '}
            {celular ? 'el celular actual queda desvinculado y ' : ''}
            el trabajador crea un PIN nuevo.
          </small>
          <button className="btn peq" onClick={() => navigator.clipboard?.writeText(codigo)}>
            <FiCopy /> Copiar
          </button>
        </div>
      ) : (
        <button className="btn primario" onClick={() => setCodigo(generarCodigo())}>
          <FiKey /> Generar código de activación
        </button>
      )}

      {celular &&
        (confirmar ? (
          <div className="aviso error confirmar">
            ¿Desvincular {celular.modelo}? El trabajador no podrá entrar hasta activar la app con un código nuevo.
            <div className="botones">
              <button className="btn peq" onClick={() => setConfirmar(false)}>
                Cancelar
              </button>
              <button
                className="btn peq peligro"
                onClick={() => {
                  setCelular(null);
                  setConfirmar(false);
                }}
              >
                Sí, desvincular
              </button>
            </div>
          </div>
        ) : (
          <button className="btn enlace-peligro" onClick={() => setConfirmar(true)}>
            <FiTrash2 /> Desvincular celular
          </button>
        ))}
      <small className="nota bloque">Demo: los cambios no se guardan hasta conectar la base de datos.</small>
    </Modal>
  );
}
