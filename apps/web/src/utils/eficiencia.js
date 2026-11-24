// Cumplimiento = reportes enviados a tiempo / reportes esperados × 100
export function porcentaje(enviados, esperados) {
  return esperados > 0 ? Math.round((enviados / esperados) * 100) : null;
}

// Color según los rangos configurados por el administrador
export function nivelEficiencia(pct, { eficienciaVerde, eficienciaNaranja }) {
  if (pct == null) return { clase: 'muted', texto: 'Sin datos' };
  if (pct >= eficienciaVerde) return { clase: 'ok', texto: 'Bueno' };
  if (pct >= eficienciaNaranja) return { clase: 'naranja', texto: 'Regular' };
  return { clase: 'danger', texto: 'Bajo' };
}
