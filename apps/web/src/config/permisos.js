// Permisos ("interruptores") del panel web. Cada función tiene su clave; un perfil solo la ve o la usa si su rol
// tiene ese permiso encendido. Con Supabase son las tablas permisos_catalogo y permisos_rol (0012 y 0014).
//
// "Supervisor" = Jefe de servicio técnico (el nombre final se define con los perfiles de la web).
export const ROLES_WEB = [
  { id: 'superadmin', texto: 'Superadministrador' },
  { id: 'admin', texto: 'Administrador de empresa' },
  { id: 'supervisor', texto: 'Supervisor (Jefe de servicio técnico)' },
  { id: 'sst', texto: 'SST' },
];

export const PERMISOS_WEB = {
  'web.configuracion.general': { grupo: 'Configuración', texto: 'Velocidad, eficiencia y geocercas' },
  'web.formularios.configurar': { grupo: 'Configuración', texto: 'Preguntas de salud y preoperacional' },
  'web.pausas.configurar': { grupo: 'Configuración', texto: 'Configurar los tiempos de las pausas' },
  'web.actividades.autorizar': {
    grupo: 'Pausas',
    texto: 'Habilitar actividades autorizadas (capacitación, reunión, cita médica…)',
  },
  'web.salud.verRespuestas': { grupo: 'Novedades', texto: 'Ver las respuestas del estado de salud' },
  'web.preoperacional.ver': { grupo: 'Novedades', texto: 'Ver los preoperacionales' },
  'web.pausas.ver': { grupo: 'Novedades', texto: 'Ver las pausas y sus informes' },
  'web.incidentes.ver': { grupo: 'Novedades', texto: 'Ver y atender incidentes' },
  'web.gps.apagar': { grupo: 'Novedades', texto: 'Apagar manualmente el GPS de un trabajador' },
  'web.ausentismo.ver': { grupo: 'Novedades', texto: 'Ver y descargar informes de ausentismo' },
  'web.reportes.excluirHoras': { grupo: 'Reportes', texto: 'Excluir horas de reporte (capacitaciones)' },
  'web.notificaciones.ver': {
    grupo: 'Novedades',
    texto: 'Ver las notificaciones enviadas a los trabajadores y si las leyeron',
  },
  'web.empresa.logo': { grupo: 'Configuración', texto: 'Subir o cambiar el logo de la empresa' },
};

const NOVEDADES = [
  'web.salud.verRespuestas',
  'web.preoperacional.ver',
  'web.pausas.ver',
  'web.incidentes.ver',
  'web.gps.apagar',
  'web.ausentismo.ver',
  'web.reportes.excluirHoras',
  'web.notificaciones.ver',
];

// Valores iniciales. El superadministrador y el administrador tienen todo; el administrador decide
// qué más se le enciende a cada perfil.
export const PERMISOS_WEB_POR_ROL = {
  superadmin: Object.keys(PERMISOS_WEB),
  admin: Object.keys(PERMISOS_WEB),
  supervisor: [...NOVEDADES, 'web.actividades.autorizar'],
  sst: [...NOVEDADES, 'web.pausas.configurar', 'web.actividades.autorizar'], // la pausa activa es un tema de SST
};

// Perfiles a los que el administrador puede encender o apagar permisos (él siempre los tiene todos)
export const ROLES_CONFIGURABLES = ['supervisor', 'sst'];
