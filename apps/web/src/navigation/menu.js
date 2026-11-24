import {
  FiMap,
  FiUsers,
  FiTruck,
  FiTarget,
  FiClock,
  FiBell,
  FiCalendar,
  FiClipboard,
  FiTrendingUp,
  FiSettings,
  FiMoon,
  FiNavigation2,
} from 'react-icons/fi';

// Opciones del menú lateral
export const menu = [
  { id: 'mapa', texto: 'Mapa en vivo', Icono: FiMap },
  { id: 'trabajadores', texto: 'Trabajadores', Icono: FiUsers },
  { id: 'vehiculos', texto: 'Vehículos', Icono: FiTruck },
  { id: 'programacion', texto: 'Programación', Icono: FiNavigation2 },
  { id: 'geocercas', texto: 'Geocercas', Icono: FiTarget },
  { id: 'historial', texto: 'Historial y km', Icono: FiClock },
  { id: 'reportes', texto: 'Reportes de actividad', Icono: FiClipboard },
  { id: 'desempeno', texto: 'Desempeño', Icono: FiTrendingUp },
  { id: 'horasExtra', texto: 'Horas extras', Icono: FiMoon },
  { id: 'alertas', texto: 'Alertas', Icono: FiBell },
  { id: 'horarios', texto: 'Horarios', Icono: FiCalendar },
  { id: 'configuracion', texto: 'Configuración', Icono: FiSettings },
];
