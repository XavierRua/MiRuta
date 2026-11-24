import { aTextoFecha, rangoPeriodo } from '../utils/fechas';

const periodos = ['Día', 'Semana', 'Mes', 'Rango'];

// Selector de periodo: Día / Semana / Mes terminan en la fecha "Hasta"; Rango permite elegir Desde y Hasta
// valor = { periodo, desde, hasta } (fechas en texto "AAAA-MM-DD")
export default function FiltroPeriodo({ valor, onCambiar, error }) {
  const hoy = aTextoFecha(new Date());
  const elegirPeriodo = (p) =>
    onCambiar(p === 'Rango' ? { ...valor, periodo: p } : { periodo: p, ...rangoPeriodo(p, valor.hasta || hoy) });

  return (
    <>
      <div className="segmentos">
        {periodos.map((p) => (
          <button key={p} className={p === valor.periodo ? 'activo' : ''} onClick={() => elegirPeriodo(p)}>
            {p}
          </button>
        ))}
      </div>
      {valor.periodo === 'Rango' && (
        <label className="campo-fecha">
          Desde
          <input
            type="date"
            value={valor.desde}
            max={hoy}
            className={error ? 'invalido' : ''}
            onChange={(e) => onCambiar({ ...valor, desde: e.target.value })}
          />
        </label>
      )}
      <label className="campo-fecha">
        {valor.periodo === 'Rango' ? 'Hasta' : valor.periodo === 'Día' ? 'Fecha' : 'Hasta'}
        <input
          type="date"
          value={valor.hasta}
          min={valor.periodo === 'Rango' ? valor.desde : undefined}
          max={hoy}
          className={error ? 'invalido' : ''}
          onChange={(e) =>
            onCambiar(
              valor.periodo === 'Rango'
                ? { ...valor, hasta: e.target.value }
                : { periodo: valor.periodo, ...rangoPeriodo(valor.periodo, e.target.value) },
            )
          }
        />
      </label>
    </>
  );
}

export function periodoInicial(periodo = 'Semana') {
  return { periodo, ...rangoPeriodo(periodo, aTextoFecha(new Date())) };
}
