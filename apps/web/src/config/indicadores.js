// Valores por defecto de los indicadores. El administrador los cambia en "Configuración".
export const INDICADORES_DEFECTO = {
  limiteVelocidad: 60, // km/h
  eficienciaVerde: 90, // % o más → verde
  eficienciaNaranja: 70, // % o más (y menos que verde) → naranja; por debajo → rojo
  toleranciaSalidaMin: 3, // minutos fuera de la geocerca de una visita antes de registrar la salida y alertar
  toleranciaLlegadaMin: 10, // primer ingreso del día más de N min después del inicio del horario → llegada tarde
  bateriaBajaPct: 20, // por debajo de este nivel (y sin cargar) se avisa al trabajador y se crea la alerta
};
