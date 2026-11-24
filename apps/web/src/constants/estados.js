// Estados posibles de un trabajador en el mapa en vivo
export const estadoInfo = {
  en_ruta: { texto: 'En ruta', clase: 'ok' },
  detenido: { texto: 'Detenido', clase: 'info' },
  sin_reporte: { texto: 'Sin reporte', clase: 'warn' },
  apagado: { texto: 'Teléfono apagado', clase: 'danger' },
  fuera_horario: { texto: 'Fuera de horario', clase: 'muted' },
};

// Color del borde del marcador en el mapa según el estado
export const colorEstado = {
  en_ruta: '#16a34a',
  detenido: '#2563eb',
  sin_reporte: '#d97706',
  apagado: '#dc2626',
  fuera_horario: '#94a3b8',
};
