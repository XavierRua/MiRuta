// Permisos que el trabajador configura una sola vez al instalar la app
export const pasosPermisos = [
  {
    id: 'ubicacion',
    icono: 'location',
    titulo: 'Ubicación "Permitir todo el tiempo"',
    detalle: 'Necesaria para que el rastreo funcione con la pantalla apagada durante tu jornada.',
    boton: 'Conceder permiso',
  },
  {
    id: 'bateria',
    icono: 'battery-charging',
    titulo: 'Quitar la optimización de batería',
    detalle: 'Evita que el celular cierre MiRuta y corte tu recorrido. Te llevamos al ajuste de tu marca de celular.',
    boton: 'Abrir ajuste',
  },
  {
    id: 'notificaciones',
    icono: 'notifications',
    titulo: 'Notificaciones',
    detalle: 'Verás un aviso fijo mientras se comparte tu ubicación y recordatorios de tu jornada.',
    boton: 'Permitir',
  },
];
