// Muestra la foto del trabajador; si no tiene, sus iniciales.
export default function Avatar({ nombres, apellidos, foto, tam = 32 }) {
  const estilo = { width: tam, height: tam, fontSize: Math.round(tam * 0.38) };
  if (foto) return <img className="avatar avatar-foto" src={foto} alt={`${nombres} ${apellidos}`} style={estilo} />;
  return (
    <div className="avatar" style={estilo}>
      {nombres[0]}
      {apellidos[0]}
    </div>
  );
}
