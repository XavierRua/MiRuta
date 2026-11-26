// Catálogo de permisos ("interruptores") de la app del trabajador.
// Cada función de la app tiene su clave. La app solo muestra o permite una función si el rol del usuario
// tiene ese permiso encendido. Más adelante el administrador los prende o apaga por rol desde la web
// (tabla permisos_rol, migración 0012) sin tocar el código.
//
// Para agregar una función nueva: 1) agregar su clave aquí, 2) envolverla con <Permiso clave="…"> o usar puede('…').
export const PERMISOS = {
  // ---------- Jornada ----------
  'jornada.indicador.recorrido': { grupo: 'Jornada', texto: 'Ver el recorrido del día en vehículo (km)' },
  'jornada.indicador.visitas': { grupo: 'Jornada', texto: 'Ver el indicador de visitas del día' },
  'jornada.indicador.eficiencia': { grupo: 'Jornada', texto: 'Ver el indicador de eficiencia del día' },
  'jornada.indicador.velocidad': { grupo: 'Jornada', texto: 'Ver la velocidad actual y el resumen de velocidad' },

  // ---------- Reportes de actividad ----------
  'reportes.enviar': { grupo: 'Reportes', texto: 'Enviar el reporte de actividad de cada hora' },
  'reportes.verDia': { grupo: 'Reportes', texto: 'Ver sus reportes del día' },

  // ---------- Horas extras ----------
  'horasExtra.usar': { grupo: 'Horas extras', texto: 'Iniciar y finalizar horas extras' },

  // ---------- Visitas ----------
  'visitas.ver': { grupo: 'Visitas', texto: 'Ver sus visitas de hoy y su detalle' },
  'visitas.verTodasMapa': { grupo: 'Visitas', texto: 'Ver todas las visitas del día en un mapa' },
  'visitas.verUbicacion': { grupo: 'Visitas', texto: 'Ver la ubicación de una visita, su geocerca y la distancia' },
  'visitas.comoLlegar': { grupo: 'Visitas', texto: 'Abrir la ruta en Google Maps o Waze' },

  // ---------- Inicio y fin de jornada ----------
  'salud.reportar': {
    grupo: 'Inicio de jornada',
    texto: 'Reporte de estado de salud al iniciar y al terminar la jornada',
  },
  'preoperacional.diligenciar': {
    grupo: 'Inicio de jornada',
    texto: 'Preoperacional del vehículo al iniciar la jornada',
  },
  'perfil.picoPlaca.editar': {
    grupo: 'Inicio de jornada',
    texto: 'Configurar los días de pico y placa de su vehículo',
  },

  // ---------- Pausas e incidentes ----------
  'pausas.usar': { grupo: 'Pausas', texto: 'Marcar pausas y descansos (con alarma al terminar)' },
  'incidentes.reportar': { grupo: 'Incidentes', texto: 'Reportar incidentes durante la jornada' },

  // ---------- Desplazamiento ----------
  'desplazamiento.ver': {
    grupo: 'Desplazamiento',
    texto: 'Ver si se desplaza a pie, en vehículo o está quieto (mapa, km y tiempos)',
  },

  // ---------- Historial ----------
  'historial.filtro.horasExtra': { grupo: 'Historial', texto: 'Filtro de horas extras del período' },
  'historial.filtro.km': { grupo: 'Historial', texto: 'Filtro de kilometraje del período' },
  'historial.filtro.eficiencia': { grupo: 'Historial', texto: 'Filtro de eficiencia del período' },
  'historial.filtro.excesos': { grupo: 'Historial', texto: 'Filtro de excesos de velocidad del período' },
  'historial.visitas': { grupo: 'Historial', texto: 'Ver el cumplimiento de visitas en el historial' },
  'historial.ingresos': { grupo: 'Historial', texto: 'Ver sus ingresos a la app y la batería de cada día' },
  'historial.reportes': { grupo: 'Historial', texto: 'Ver los reportes de días anteriores' },

  // ---------- Mi perfil ----------
  'perfil.vehiculo.ver': { grupo: 'Mi perfil', texto: 'Ver su vehículo y los documentos del vehículo' },
  'documentos.vehiculo.actualizar': {
    grupo: 'Mi perfil',
    texto: 'Actualizar los documentos del vehículo al renovarlos',
  },
  'documentos.adicionales.ver': {
    grupo: 'Mi perfil',
    texto: 'Ver sus documentos adicionales (ARL, planilla, certificados, exámenes)',
  },
  'perfil.horario.ver': { grupo: 'Mi perfil', texto: 'Ver su horario' },
  'perfil.datos.ver': { grupo: 'Mi perfil', texto: 'Ver sus datos personales' },
  'perfil.solicitarEliminacion': { grupo: 'Menú → Seguridad', texto: 'Solicitar la eliminación de su cuenta' },

  // ---------- Encabezado y menú ----------
  'actividades.usar': {
    grupo: 'Pausas',
    texto: 'Iniciar las actividades autorizadas que le habiliten (capacitación, reunión, cita médica…)',
  },
  'notificaciones.ver': { grupo: 'Encabezado', texto: 'Campana de notificaciones con la lista de avisos' },
  'seguridad.cambiarPin': { grupo: 'Menú → Seguridad', texto: 'Cambiar su contraseña (PIN)' },
};

// Permisos encendidos por rol mientras no haya base de datos (hoy: el trabajador tiene todos).
// La autorización de datos (Ley 1581), cerrar sesión y el estado del rastreo no son permisos: siempre están.
export const PERMISOS_POR_ROL = {
  trabajador: Object.keys(PERMISOS),
};
