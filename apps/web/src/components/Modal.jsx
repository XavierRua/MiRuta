export default function Modal({ titulo, onCerrar, children, pie }) {
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{titulo}</h2>
          <button className="icono" onClick={onCerrar}>
            ×
          </button>
        </header>
        <div className="modal-cuerpo">{children}</div>
        {pie && <footer>{pie}</footer>}
      </div>
    </div>
  );
}
