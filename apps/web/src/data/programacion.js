// Programaciones de ejemplo (visitas que asigna el administrador).
// tipo: 'ruta' (varios puntos en orden) · 'obra' (un lugar con radio = geocerca) · 'zona' (área en el mapa)
import { aTextoFecha } from '../utils/fechas';

const hace = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return aTextoFecha(d);
};

export const programacionesEjemplo = [
  {
    id: 'p1',
    tipo: 'obra',
    titulo: 'Supervisión Obra Torre Norte',
    trabajadores: ['t1', 't3'],
    fecha: hace(20),
    hora: '08:00',
    puntos: [{ nombre: 'Obra Torre Norte', direccion: 'Cra. 52 #76-20, Medellín', lat: 6.2853, lng: -75.5651 }],
    radio: 120,
    area: [],
    descripcion: 'Verificar avance de la obra y recibir material.',
    repeticion: { tipo: 'lunes_viernes', dias: [], hasta: '' },
    estado: 'activa',
  },
  {
    id: 'p2',
    tipo: 'ruta',
    titulo: 'Entregas Laureles',
    trabajadores: ['t1'],
    fecha: hace(20),
    hora: '09:30',
    puntos: [
      { nombre: 'Bodega central', direccion: 'Cl. 30 #65-10', lat: 6.2335, lng: -75.5847 },
      { nombre: 'Cliente Laureles', direccion: 'Cq. 1 #74-30', lat: 6.2442, lng: -75.5899 },
      { nombre: 'Droguería La 70', direccion: 'Cra. 70 #44-15', lat: 6.2524, lng: -75.5895 },
    ],
    radio: 80,
    area: [],
    descripcion: 'Entregar pedidos en el orden de la ruta. Pedir firma de recibido.',
    repeticion: { tipo: 'semanal', dias: [1, 3, 5], hasta: '' },
    estado: 'activa',
  },
  {
    id: 'p3',
    tipo: 'zona',
    titulo: 'Zona Centro – ventas',
    trabajadores: ['t2', 't7'],
    fecha: hace(20),
    hora: '13:00',
    puntos: [],
    radio: 0,
    area: [
      [6.256, -75.572],
      [6.256, -75.561],
      [6.244, -75.561],
      [6.244, -75.572],
    ],
    descripcion: 'Visitar comercios de la zona y levantar pedidos.',
    repeticion: { tipo: 'diaria', dias: [], hasta: '' },
    estado: 'activa',
  },
  {
    id: 'p4',
    tipo: 'obra',
    titulo: 'Cliente Éxito Colombia',
    trabajadores: ['t1', 't4'],
    fecha: hace(0),
    hora: '15:30',
    puntos: [{ nombre: 'Éxito Colombia', direccion: 'Cl. 10 #43A-30, Medellín', lat: 6.2087, lng: -75.5716 }],
    radio: 150,
    area: [],
    descripcion: 'Reunión con el jefe de compras.',
    repeticion: { tipo: 'no', dias: [], hasta: '' },
    estado: 'activa',
  },
  {
    id: 'p5',
    tipo: 'ruta',
    titulo: 'Recorrido Sur',
    trabajadores: ['t5', 't6'],
    fecha: hace(20),
    hora: '08:30',
    puntos: [
      { nombre: 'Bodega Itagüí', direccion: 'Cra. 50 #36-20, Itagüí', lat: 6.181, lng: -75.599 },
      { nombre: 'Cliente Envigado', direccion: 'Cl. 38 Sur #43-10', lat: 6.1695, lng: -75.5862 },
    ],
    radio: 100,
    area: [],
    descripcion: '',
    repeticion: { tipo: 'lunes_viernes', dias: [], hasta: '' },
    estado: 'activa',
  },
  {
    id: 'p6',
    tipo: 'obra',
    titulo: 'Obra Puente Itagüí (suspendida)',
    trabajadores: ['t6'],
    fecha: hace(10),
    hora: '07:30',
    puntos: [{ nombre: 'Obra Puente Itagüí', direccion: 'Autopista Sur, Itagüí', lat: 6.1752, lng: -75.6031 }],
    radio: 200,
    area: [],
    descripcion: 'Programación cancelada por suspensión de la obra.',
    repeticion: { tipo: 'diaria', dias: [], hasta: '' },
    estado: 'cancelada',
  },
];
