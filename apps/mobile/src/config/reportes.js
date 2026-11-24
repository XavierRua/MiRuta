// Reglas del reporte de actividad cada hora.
// Cambia estos valores para ajustar el comportamiento sin tocar las pantallas.
export const REPORTES = {
  intervaloMin: 60, // un reporte por cada hora del horario
  // Cada reporte solo se puede enviar DENTRO de su hora: el de 9:00 entre 9:00 y 9:59.
  // Pasada esa hora queda como "No reportó".
  // Hora de más al final de la jornada para enviar el último reporte: si el horario del administrador
  // termina a las 5:00 p. m., el reporte de 4:00 – 5:00 se puede enviar hasta las 6:00 p. m.
  // Después ya no se puede enviar nada (salvo que el trabajador haya iniciado horas extras).
  margenCierreMin: 60,
  avisoAntesDeCerrarMin: 10, // recordatorio extra cuando faltan 10 minutos para que cierre la hora
  minCaracteres: 10, // largo mínimo de la descripción
  maxFotosTarea: 3,
  permitirGaleriaTarea: false, // false = fotos de la tarea solo con cámara (evidencia más confiable)
};

// Hora del servidor: se usa en lugar del reloj del celular para que no se pueda hacer trampa.
export const HORA_SERVIDOR = {
  // Cualquier servidor HTTPS que devuelva el encabezado "Date". Con Supabase se cambia por la URL del proyecto.
  url: 'https://www.cloudflare.com/cdn-cgi/trace',
  resincronizarMin: 5, // vuelve a consultar la hora cada 5 minutos
  maxDesfaseMin: 2, // si el celular está adelantado o atrasado más de esto, se muestra un aviso
};

// Compresión de fotos (para no llenar el almacenamiento gratuito)
// Una foto de tarea queda en ~100–180 KB y la selfie en ~25–45 KB.
export const FOTOS = {
  tarea: { ladoMax: 1024, calidad: 0.5 },
  selfie: { ladoMax: 480, calidad: 0.5 },
};
