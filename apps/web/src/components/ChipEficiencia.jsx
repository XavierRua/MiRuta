import { useConfig } from '../context/ConfigContext';
import { nivelEficiencia } from '../utils/eficiencia';

// Porcentaje de cumplimiento de reportes con su color (verde / naranja / rojo según la configuración)
export default function ChipEficiencia({ pct, grande = false }) {
  const { indicadores } = useConfig();
  const n = nivelEficiencia(pct, indicadores);
  if (grande) return <strong className={`texto-${n.clase}`}>{pct == null ? '—' : `${pct} %`}</strong>;
  return <span className={`chip ${n.clase}`}>{pct == null ? '—' : `${pct} %`}</span>;
}
