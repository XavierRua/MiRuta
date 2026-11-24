// Rangos de los indicadores. Son los mismos que ajusta el administrador en el panel web (Configuración).
// En la demo son fijos; con Supabase se leen de la tabla configuracion_empresa.
export const INDICADORES = {
  eficienciaVerde: 90, // % o más → verde
  eficienciaNaranja: 70, // % o más → naranja; por debajo → rojo
  limiteVelocidad: 60, // km/h: por encima → rojo (exceso)
  margenCercaLimite: 10, // naranja cuando va a 10 km/h o menos del límite
};
