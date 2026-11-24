import { INDICADORES } from '../config/indicadores';
import { color } from '../theme/colors';

// Eficiencia = reportes enviados a tiempo ÷ reportes esperados × 100
export function porcentaje(enviados, esperados) {
  return esperados > 0 ? Math.round((enviados / esperados) * 100) : null;
}

// Color y texto según los rangos de la empresa
export function nivelEficiencia(pct, rangos = INDICADORES) {
  if (pct == null) return { texto: 'Sin datos', color: color.suave, fondo: '#eef2f7' };
  if (pct >= rangos.eficienciaVerde) return { texto: 'Muy bien', color: color.verde, fondo: color.verdeSuave };
  if (pct >= rangos.eficienciaNaranja)
    return { texto: 'Puedes mejorar', color: color.naranja, fondo: color.naranjaSuave };
  return { texto: 'Bajo', color: color.rojo, fondo: color.rojoSuave };
}

// Eficiencia de HOY hasta este momento: solo cuentan las horas que ya cerraron o que ya se reportaron
export function eficienciaHoy(conEstado) {
  const enviados = conEstado.filter((f) => f.estado === 'enviado').length;
  const noReporto = conEstado.filter((f) => f.estado === 'no_reporto').length;
  return {
    enviados,
    esperados: enviados + noReporto,
    total: conEstado.length,
    pct: porcentaje(enviados, enviados + noReporto),
  };
}
