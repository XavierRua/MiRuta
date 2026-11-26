// Datos de ejemplo para el prototipo. Se reemplazarán por consultas a Supabase (ver services/api.js).
export const empresas = [
  { id: 'e1', nombre: 'Distribuciones Andina S.A.S.' },
  { id: 'e2', nombre: 'Mensajería Rápida Medellín' },
];
export const trabajadores = [
  {
    id: 't1',
    empresaId: 'e1',
    nombres: 'Carlos',
    apellidos: 'Restrepo',
    cedula: '1.036.458.221',
    telefono: '300 512 8890',
    cargo: 'Mensajero',
    grupo: 'Zona Centro',
    vehiculoPlaca: 'ABC12F',
    estado: 'en_ruta',
    lat: 6.2518,
    lng: -75.5636,
    velocidad: 32,
    bateria: 78,
    ultimoReporte: 'hace 20 s',
    kmHoy: 42.6,
    horario: 'L–V 7:00–17:00 · S 7:00–12:00',
    geocercaActual: null,
    consentimiento: true,
    eps: 'Sura',
    arl: 'Sura',
    tipoSangre: 'O+',
  },
  {
    id: 't2',
    empresaId: 'e1',
    nombres: 'Andrés',
    apellidos: 'Gómez',
    cedula: '1.017.233.904',
    telefono: '311 774 2210',
    cargo: 'Vendedor',
    grupo: 'Zona Centro',
    vehiculoPlaca: 'XYZ34G',
    estado: 'detenido',
    lat: 6.2442,
    lng: -75.5899,
    velocidad: 0,
    bateria: 54,
    ultimoReporte: 'hace 45 s',
    kmHoy: 18.3,
    horario: 'L–V 7:00–17:00 · S 7:00–12:00',
    geocercaActual: 'Cliente Laureles',
    consentimiento: true,
    eps: 'Nueva EPS',
    arl: 'Positiva',
    tipoSangre: 'A+',
  },
  {
    id: 't3',
    empresaId: 'e1',
    nombres: 'Juliana',
    apellidos: 'Ospina',
    cedula: '43.889.120',
    telefono: '315 220 4471',
    cargo: 'Técnica',
    grupo: 'Zona Norte',
    vehiculoPlaca: 'MNO56H',
    estado: 'en_ruta',
    lat: 6.2853,
    lng: -75.5651,
    velocidad: 4,
    modo: 'a_pie', // caminando dentro de la Obra Torre Norte
    bateria: 91,
    ultimoReporte: 'hace 10 s',
    kmHoy: 55.1,
    horario: 'L–V 7:00–17:00',
    geocercaActual: null,
    consentimiento: true,
    eps: 'Sanitas',
    arl: 'Sura',
    tipoSangre: 'O-',
  },
  {
    id: 't4',
    empresaId: 'e1',
    nombres: 'Diego',
    apellidos: 'Muñoz',
    cedula: '98.765.432',
    telefono: '320 118 9045',
    cargo: 'Mensajero',
    grupo: 'Zona Norte',
    vehiculoPlaca: 'PQR78J',
    estado: 'sin_reporte',
    lat: 6.2675,
    lng: -75.542,
    velocidad: 0,
    bateria: 12,
    ultimoReporte: 'hace 18 min',
    kmHoy: 23.9,
    horario: 'L–V 7:00–17:00',
    geocercaActual: null,
    consentimiento: true,
    eps: 'Sura',
    arl: 'Sura',
    tipoSangre: 'B+',
  },
  {
    id: 't5',
    empresaId: 'e1',
    nombres: 'Laura',
    apellidos: 'Cárdenas',
    cedula: '1.152.447.019',
    telefono: '301 665 3320',
    cargo: 'Vendedora',
    grupo: 'Zona Sur',
    vehiculoPlaca: 'STU90K',
    estado: 'apagado',
    lat: 6.2087,
    lng: -75.5716,
    velocidad: 0,
    bateria: 63,
    ultimoReporte: 'hace 34 min',
    kmHoy: 31.4,
    horario: 'L–V 8:00–18:00',
    geocercaActual: null,
    consentimiento: true,
    eps: 'Compensar',
    arl: 'Colmena',
    tipoSangre: 'A-',
  },
  {
    id: 't6',
    empresaId: 'e1',
    nombres: 'Mateo',
    apellidos: 'Vélez',
    cedula: '1.001.239.876',
    telefono: '304 902 1187',
    cargo: 'Técnico',
    grupo: 'Zona Sur',
    vehiculoPlaca: 'VWX12L',
    estado: 'en_ruta',
    lat: 6.2205,
    lng: -75.5988,
    velocidad: 27,
    bateria: 69,
    ultimoReporte: 'hace 15 s',
    kmHoy: 37.8,
    horario: 'L–V 8:00–18:00',
    geocercaActual: null,
    consentimiento: false,
    eps: 'Sura',
    arl: 'Sura',
    tipoSangre: 'O+',
  },
  {
    id: 't7',
    empresaId: 'e1',
    nombres: 'Sofía',
    apellidos: 'Arango',
    cedula: '1.040.556.781',
    telefono: '310 443 7712',
    cargo: 'Mensajera',
    grupo: 'Zona Centro',
    vehiculoPlaca: null,
    estado: 'fuera_horario',
    lat: 6.239,
    lng: -75.575,
    velocidad: 0,
    bateria: 88,
    ultimoReporte: 'ayer 17:00',
    kmHoy: 0,
    horario: 'S–D 9:00–15:00',
    geocercaActual: null,
    consentimiento: true,
    eps: 'Sura',
    arl: 'Sura',
    tipoSangre: 'AB+',
  },
  {
    id: 't8',
    empresaId: 'e2',
    nombres: 'Felipe',
    apellidos: 'Zapata',
    cedula: '1.128.990.334',
    telefono: '312 667 0091',
    cargo: 'Mensajero',
    grupo: 'General',
    vehiculoPlaca: 'JKL45M',
    estado: 'en_ruta',
    lat: 6.26,
    lng: -75.58,
    velocidad: 35,
    bateria: 72,
    ultimoReporte: 'hace 12 s',
    kmHoy: 48.2,
    horario: 'L–S 7:00–16:00',
    geocercaActual: null,
    consentimiento: true,
    eps: 'Sura',
    arl: 'Sura',
    tipoSangre: 'O+',
  },
];
// Fotos de ejemplo (dibujos). Las reales vendrán del formulario de registro.
// Sofía queda sin foto para mostrar cómo se ven las iniciales.
trabajadores.forEach((t) => {
  if (t.nombres !== 'Sofía') {
    t.foto = `https://api.dicebear.com/9.x/avataaars/svg?seed=${t.nombres}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  }
});

// Celular vinculado de cada trabajador (null = aún no ha activado la app)
const celulares = {
  t1: { modelo: 'Xiaomi Redmi Note 13', sistema: 'Android 15', vinculadoEn: '2026-11-02' },
  t2: { modelo: 'Motorola Moto G84', sistema: 'Android 14', vinculadoEn: '2026-10-28' },
  t3: { modelo: 'Samsung Galaxy A35', sistema: 'Android 15', vinculadoEn: '2026-10-30' },
  t4: { modelo: 'Samsung Galaxy A54', sistema: 'Android 15', vinculadoEn: '2026-11-05' },
  t5: { modelo: 'Apple iPhone 13', sistema: 'iOS 19', vinculadoEn: '2026-11-10' },
  t6: null,
  t7: { modelo: 'Xiaomi Redmi 13C', sistema: 'Android 14', vinculadoEn: '2026-11-12' },
  t8: { modelo: 'Samsung Galaxy A15', sistema: 'Android 14', vinculadoEn: '2026-11-01' },
};
trabajadores.forEach((t) => {
  t.celular = celulares[t.id] ?? null;
});

// Ubicaciones guardadas en el celular esperando señal (solo las ve el administrador)
const pendientes = { t4: 37, t5: 12 };
trabajadores.forEach((t) => {
  t.puntosPendientes = pendientes[t.id] ?? 0;
});
export const vehiculos = [
  {
    placa: 'ABC12F',
    empresaId: 'e1',
    tipo: 'Moto',
    marca: 'Yamaha',
    modelo: 'FZ 2.0 · 2022',
    color: 'Azul',
    cilindraje: 150,
    propietario: 'Trabajador',
    asignadoA: 'Carlos Restrepo',
    soat: '2027-03-14',
    tecnomecanica: '2027-01-20',
    kmMes: 812,
  },
  {
    placa: 'XYZ34G',
    empresaId: 'e1',
    tipo: 'Moto',
    marca: 'Honda',
    modelo: 'CB 125F · 2023',
    color: 'Negro',
    cilindraje: 125,
    propietario: 'Empresa',
    asignadoA: 'Andrés Gómez',
    soat: '2026-12-02',
    tecnomecanica: '2027-05-11',
    kmMes: 455,
  },
  {
    placa: 'MNO56H',
    empresaId: 'e1',
    tipo: 'Moto',
    marca: 'Suzuki',
    modelo: 'Gixxer 150 · 2021',
    color: 'Rojo',
    cilindraje: 155,
    propietario: 'Trabajador',
    asignadoA: 'Juliana Ospina',
    soat: '2027-06-30',
    tecnomecanica: '2026-11-28',
    kmMes: 1043,
  },
  {
    placa: 'PQR78J',
    empresaId: 'e1',
    tipo: 'Moto',
    marca: 'Bajaj',
    modelo: 'Pulsar NS 160 · 2022',
    color: 'Blanco',
    cilindraje: 160,
    propietario: 'Empresa',
    asignadoA: 'Diego Muñoz',
    soat: '2026-11-15',
    tecnomecanica: '2027-02-08',
    kmMes: 698,
  },
  {
    placa: 'STU90K',
    empresaId: 'e1',
    tipo: 'Moto',
    marca: 'AKT',
    modelo: 'NKD 125 · 2024',
    color: 'Gris',
    cilindraje: 125,
    propietario: 'Trabajador',
    asignadoA: 'Laura Cárdenas',
    soat: '2027-08-19',
    tecnomecanica: '2028-08-19',
    kmMes: 590,
  },
  {
    placa: 'VWX12L',
    empresaId: 'e1',
    tipo: 'Moto',
    marca: 'TVS',
    modelo: 'Apache 160 · 2023',
    color: 'Negro',
    cilindraje: 160,
    propietario: 'Empresa',
    asignadoA: 'Mateo Vélez',
    soat: '2027-04-04',
    tecnomecanica: '2027-04-01',
    kmMes: 731,
  },
  {
    placa: 'GHI901',
    empresaId: 'e1',
    tipo: 'Camioneta',
    marca: 'Chevrolet',
    modelo: 'D-Max · 2020',
    color: 'Blanco',
    cilindraje: 2500,
    propietario: 'Empresa',
    asignadoA: null,
    soat: '2027-02-22',
    tecnomecanica: '2026-12-15',
    kmMes: 210,
  },
];
export const geocercas = [
  {
    id: 'g1',
    nombre: 'Sede principal',
    tipo: 'punto_visita',
    forma: 'circulo',
    centro: [6.2476, -75.5658],
    radio: 150,
    asignados: 'Todos',
  },
  {
    id: 'g2',
    nombre: 'Cliente Laureles',
    tipo: 'punto_visita',
    forma: 'circulo',
    centro: [6.2442, -75.5899],
    radio: 120,
    asignados: 'Zona Centro',
  },
  {
    id: 'g3',
    nombre: 'Zona Norte',
    tipo: 'zona_permitida',
    forma: 'poligono',
    puntos: [
      [6.3, -75.585],
      [6.3, -75.54],
      [6.268, -75.535],
      [6.262, -75.575],
    ],
    asignados: 'Zona Norte',
  },
  {
    id: 'g4',
    nombre: 'Bodega Itagüí',
    tipo: 'punto_visita',
    forma: 'circulo',
    centro: [6.181, -75.599],
    radio: 200,
    asignados: 'Zona Sur',
  },
];
export const eventosGeocerca = [
  {
    trabajador: 'Andrés Gómez',
    geocerca: 'Cliente Laureles',
    entrada: '10:42',
    salida: null,
    permanencia: '38 min (en curso)',
  },
  {
    trabajador: 'Carlos Restrepo',
    geocerca: 'Sede principal',
    entrada: '07:03',
    salida: '07:41',
    permanencia: '38 min',
  },
  {
    trabajador: 'Juliana Ospina',
    geocerca: 'Zona Norte',
    entrada: '07:25',
    salida: '11:02',
    permanencia: '3 h 37 min',
  },
  { trabajador: 'Diego Muñoz', geocerca: 'Zona Norte', entrada: '07:40', salida: '10:58', permanencia: '3 h 18 min' },
  { trabajador: 'Mateo Vélez', geocerca: 'Bodega Itagüí', entrada: '08:15', salida: '09:05', permanencia: '50 min' },
  { trabajador: 'Laura Cárdenas', geocerca: 'Bodega Itagüí', entrada: '08:20', salida: '08:52', permanencia: '32 min' },
];
export const alertas = [
  {
    id: 31,
    tipo: 'llegada_tarde',
    trabajador: 'Diego Muñoz',
    mensaje: 'Primer ingreso a la app a las 7:24 (24 min después del inicio de su horario) · 🔋 81 %',
    hora: '7:24',
    estado: 'abierta',
  },
  {
    id: 32,
    tipo: 'bateria_baja',
    trabajador: 'Laura Cárdenas',
    mensaje: 'Su celular quedó con 18 % de batería y no está cargando. Se le avisó para que lo cargue.',
    hora: '10:05',
    estado: 'abierta',
  },
  {
    id: 21,
    tipo: 'salud_no_apto',
    trabajador: 'Mateo Vélez',
    mensaje:
      'Respondió que NO está en condiciones de trabajar: "Fiebre y dolor de cabeza desde anoche". Comunícate con él.',
    hora: '7:12',
    estado: 'abierta',
  },
  {
    id: 22,
    tipo: 'incidente',
    trabajador: 'Andrés Gómez',
    mensaje: 'Caída leve al bajar de la moto · no puede continuar · 6.25010, -75.56810 · 1 foto',
    hora: '10:41',
    estado: 'abierta',
  },
  {
    id: 23,
    tipo: 'preoperacional_falla',
    trabajador: 'Diego Muñoz',
    mensaje: 'Preoperacional de PQR78J con falla en: Frenos ("frena muy largo"). Revisar antes de salir.',
    hora: '7:21',
    estado: 'abierta',
  },
  {
    id: 24,
    tipo: 'formularios_pendientes',
    trabajador: 'Laura Cárdenas',
    mensaje:
      'A las 7:30 aún no diligencia el estado de salud ni el preoperacional (horario desde las 7:00). El GPS ya está activo.',
    hora: '7:30',
    estado: 'vista',
  },
  {
    id: 11,
    tipo: 'intento_otro_celular',
    trabajador: 'Diego Muñoz',
    mensaje:
      'Intentaron activar su cuenta en otro celular (Xiaomi Redmi Note 13). Su celular vinculado es Samsung Galaxy A54',
    hora: '11:20',
    estado: 'abierta',
  },
  {
    id: 12,
    tipo: 'pin_bloqueado',
    trabajador: 'Mateo Vélez',
    mensaje: 'La app se bloqueó por 5 PIN incorrectos. Genera un código de activación para reactivarla',
    hora: '07:52',
    estado: 'cerrada',
  },
  {
    id: 9,
    tipo: 'no_reporto',
    trabajador: 'Diego Muñoz',
    mensaje: 'No reportó la hora 10:00 – 11:00',
    hora: '11:15',
    estado: 'abierta',
  },
  {
    id: 10,
    tipo: 'reporte_recibido',
    trabajador: 'Carlos Restrepo',
    mensaje: 'Envió su reporte de 10:00 – 11:00 con 2 fotos y selfie',
    hora: '10:58',
    estado: 'vista',
  },
  {
    id: 1,
    tipo: 'salida_geocerca',
    trabajador: 'Diego Muñoz',
    mensaje: 'Salió de la geocerca "Zona Norte"',
    hora: '10:58',
    estado: 'abierta',
  },
  {
    id: 2,
    tipo: 'sin_reporte',
    trabajador: 'Diego Muñoz',
    mensaje: 'Sin reporte de ubicación hace 18 min (batería 12 %)',
    hora: '11:02',
    estado: 'abierta',
  },
  {
    id: 3,
    tipo: 'apagado_usuario',
    trabajador: 'Laura Cárdenas',
    mensaje: 'Teléfono apagado probablemente por el usuario (batería 63 %)',
    hora: '10:46',
    estado: 'abierta',
  },
  {
    id: 5,
    tipo: 'documento_por_vencer',
    trabajador: 'Juliana Ospina',
    mensaje: 'La revisión técnico-mecánica de MNO56H vence el 28/11/2026',
    hora: '06:00',
    estado: 'abierta',
  },
  {
    id: 6,
    tipo: 'rastreo_no_iniciado',
    trabajador: 'Mateo Vélez',
    mensaje: 'El rastreo no inició a las 8:00. Inició a las 8:12',
    hora: '08:12',
    estado: 'cerrada',
  },
  {
    id: 7,
    tipo: 'ubicacion_falsa',
    trabajador: 'Carlos Restrepo',
    mensaje: 'Se detectó una app de ubicación simulada durante 2 min',
    hora: '08:47',
    estado: 'vista',
  },
  {
    id: 8,
    tipo: 'gps_desactivado',
    trabajador: 'Andrés Gómez',
    mensaje: 'Desactivó el GPS durante 6 min',
    hora: '09:10',
    estado: 'cerrada',
  },
];
export const jornadasEjemplo = [
  { fecha: 'Lun 23 nov', inicio: '07:00', fin: 'en curso', km: 42.6, duracion: '4 h 05 min', visitas: 3, alertas: 1 },
  { fecha: 'Sáb 21 nov', inicio: '07:00', fin: '12:00', km: 21.4, duracion: '5 h', visitas: 2, alertas: 0 },
  { fecha: 'Vie 20 nov', inicio: '07:00', fin: '17:00', km: 68.2, duracion: '10 h', visitas: 6, alertas: 0 },
  { fecha: 'Jue 19 nov', inicio: '07:00', fin: '18:30*', km: 74.9, duracion: '11 h 30 min', visitas: 7, alertas: 1 },
  { fecha: 'Mié 18 nov', inicio: '07:00', fin: '17:00', km: 59.7, duracion: '10 h', visitas: 5, alertas: 0 },
  { fecha: 'Mar 17 nov', inicio: '07:00', fin: '17:00', km: 63.0, duracion: '10 h', visitas: 6, alertas: 2 },
];
// Recorrido de ejemplo de Carlos Restrepo (hoy)
// Recorrido de ejemplo partido en tramos por modo (en vehículo → a pie dentro de un lugar → en vehículo)
export const recorridoTramosEjemplo = () => [
  { modo: 'vehiculo', puntos: recorridoEjemplo.slice(0, 6) },
  { modo: 'a_pie', puntos: recorridoEjemplo.slice(5, 8) },
  { modo: 'vehiculo', puntos: recorridoEjemplo.slice(7) },
];
export const recorridoEjemplo = [
  [6.2476, -75.5658],
  [6.249, -75.564],
  [6.2512, -75.5612],
  [6.255, -75.56],
  [6.2588, -75.5615],
  [6.261, -75.566],
  [6.2598, -75.5712],
  [6.2565, -75.5745],
  [6.253, -75.573],
  [6.2505, -75.569],
  [6.2518, -75.5636],
];
export const horarios = [
  {
    nombre: 'Diurno lunes a sábado',
    franjas: 'L–V 7:00–17:00 · S 7:00–12:00',
    aplicaA: 'Grupo Zona Centro',
    festivos: 'No trabaja',
  },
  { nombre: 'Diurno lunes a viernes', franjas: 'L–V 7:00–17:00', aplicaA: 'Grupo Zona Norte', festivos: 'No trabaja' },
  { nombre: 'Turno tarde', franjas: 'L–V 8:00–18:00', aplicaA: 'Grupo Zona Sur', festivos: 'No trabaja' },
  { nombre: 'Fin de semana', franjas: 'S–D 9:00–15:00', aplicaA: 'Sofía Arango', festivos: 'Sí trabaja' },
];

// ---------- Reportes de actividad cada hora (ejemplo) ----------
const tareasEjemplo = [
  'Entrega de documentos en recepción y firma de recibido.',
  'Recogida de paquetes para despacho de la tarde.',
  'Visita al cliente para revisar el pedido pendiente.',
  'Instalación y prueba del equipo en el punto de venta.',
  'Desplazamiento entre clientes; tráfico pesado en la Avenida 80.',
  'Inventario rápido de mercancía en bodega.',
  'Reunión con el supervisor de obra para coordinar entregas.',
  'Entrega de material en obra y verificación de cantidades.',
];
const lugaresEjemplo = [
  'Sede principal',
  'Cliente Laureles',
  'Cliente Éxito Colombia',
  'Obra Torre Norte',
  'Zona Centro',
];

// 60 días de reportes para los trabajadores con horario de lunes a sábado.
// Cada reporte solo se puede enviar dentro de su hora; algunas horas quedan como "No reportó".
function generarReportes() {
  const lista = [];
  const ahora = new Date();
  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);
  trabajadores
    .filter((t) => t.empresaId === 'e1' && t.estado !== 'fuera_horario')
    .forEach((t, ti) => {
      for (let d = 0; d < 60; d++) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() - d);
        if (fecha.getDay() === 0) continue;
        const fin = fecha.getDay() === 6 ? 12 : 17;
        for (let h = 7; h < fin; h++) {
          const cierre = new Date(fecha);
          cierre.setHours(h + 1, 0, 0, 0);
          if (cierre > ahora) break; // franjas que aún no terminan
          const semilla = (ti + 1) * 31 + d * 7 + h;
          // cada trabajador con un nivel de cumplimiento distinto para ver los tres colores
          const tasaFalla = [4, 13, 24, 8, 36, 18][ti % 6];
          // 12:00–13:00 entre semana: toda la hora en almuerzo → "En pausa – Almuerzo" (no cuenta en la eficiencia)
          const almuerzo = h === 12 && fin === 17;
          // 8:00–9:00: algunos días con desayuno de 8:00 a 8:15 → ventana extendida hasta 9:15
          const desayuno = h === 8 && semilla % 3 === 0;
          const estado = almuerzo
            ? 'en_pausa'
            : (semilla * 37 + h * 11 + d * 5) % 100 < tasaFalla
              ? 'no_reporto'
              : 'a_tiempo';
          if (desayuno && new Date(cierre.getTime() + 15 * 60000) > ahora) break;
          const enviadoEn = desayuno
            ? new Date(cierre.getTime() + (3 + (semilla % 11)) * 60000) // dentro de la extensión (hasta 9:15)
            : new Date(cierre.getTime() - (2 + (semilla % 50)) * 60000); // dentro de la hora
          lista.push({
            id: `${t.id}-${fecha.toISOString().slice(0, 10)}-${h}`,
            trabajadorId: t.id,
            fecha,
            franja: `${h}:00 – ${h + 1}:00`,
            estado,
            pausa: almuerzo ? 'Almuerzo' : null,
            // Batería al enviar el reporte (respaldo ante "se me descargó el celular")
            bateria: estado === 'a_tiempo' ? Math.max(9, 97 - (h - 7) * 7 - (semilla % 9)) : null,
            extension: desayuno ? 'Extendido +15 min por desayuno' : null,
            enviadoEn: estado === 'a_tiempo' ? enviadoEn : null,
            descripcion: estado === 'a_tiempo' ? tareasEjemplo[semilla % tareasEjemplo.length] : null,
            lugar: lugaresEjemplo[semilla % lugaresEjemplo.length],
            lat: t.lat + ((semilla % 9) - 4) * 0.001,
            lng: t.lng + ((semilla % 7) - 3) * 0.001,
            precisionM: 5 + (semilla % 15),
            fotos: estado !== 'a_tiempo' ? 0 : 1 + (semilla % 3),
            pesoKB: estado !== 'a_tiempo' ? 0 : 35 + (1 + (semilla % 3)) * (110 + (semilla % 60)),
          });
        }
      }
    });
  return lista.sort((a, b) => (b.enviadoEn ?? b.fecha) - (a.enviadoEn ?? a.fecha));
}

export const reportesActividad = generarReportes();

// ---------- Desempeño diario: km y velocidades (ejemplo) ----------
// Con el GPS real se calcula al cerrar cada jornada:
// - km: suma de distancias entre puntos válidos
// - velocidad promedio: km / tiempo en movimiento (se descuentan las paradas)
// - velocidad máxima y "picos": puntos por encima de 50 km/h, con hora y ubicación
// Los excesos se calculan comparando los picos con el límite que configure el administrador.
// Lugares de ejemplo donde se hacen horas extras (con GPS real: la ubicación al iniciarlas)
const LUGARES_EXTRA = [
  { nombre: 'Obra Torre Norte', lat: 6.2853, lng: -75.5651 },
  { nombre: 'Bodega central', lat: 6.2335, lng: -75.5847 },
  { nombre: 'Cliente Éxito Colombia', lat: 6.2069, lng: -75.5711 },
  { nombre: 'Zona Centro', lat: 6.25, lng: -75.5681 },
];

function generarDesempeno() {
  const lista = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  trabajadores
    .filter((t) => t.estado !== 'fuera_horario')
    .forEach((t, ti) => {
      for (let d = 0; d < 60; d++) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() - d);
        if (fecha.getDay() === 0) continue;
        const sabado = fecha.getDay() === 6;
        const semilla = (ti + 3) * 17 + d * 11 + fecha.getDate();
        const km = Math.round(((sabado ? 18 : 40) + (semilla % 35) + ti * 1.7) * 10) / 10;
        const horasMovimiento = Math.round((km / (22 + (semilla % 9))) * 100) / 100;
        const picos = [];
        const nPicos = Math.max(0, (semilla % 7) - 3); // casi siempre 0; a veces 1 a 3 picos
        for (let k = 0; k < nPicos; k++) {
          const h = 8 + ((semilla + k * 3) % (sabado ? 4 : 9));
          const m = (semilla * (k + 1) * 7) % 60;
          picos.push({
            hora: `${h}:${String(m).padStart(2, '0')}`,
            velocidad: 52 + ((semilla * (k + 2)) % 34), // 52–85 km/h
            lat: t.lat + (((semilla + k) % 11) - 5) * 0.003,
            lng: t.lng + (((semilla + k * 2) % 9) - 4) * 0.003,
            via: ['Av. 80', 'Autopista Sur', 'Av. Regional', 'Calle 10', 'Av. El Poblado', 'Av. Las Vegas'][
              (semilla + k) % 6
            ],
          });
        }
        // Horas extras de ejemplo: algunos días, después de las 5:00 p. m.
        let horasExtra = null;
        const ahoraReal = new Date();
        if (!sabado && (semilla * 7 + d * 3 + ti) % 6 === 0 && (d > 0 || ahoraReal.getHours() >= 19)) {
          const ini = new Date(fecha);
          ini.setHours(17, 3 + (semilla % 25), 0, 0);
          const fin = new Date(ini.getTime() + (55 + (semilla % 70)) * 60000);
          const esperados = Math.floor((fin - ini) / 3600000);
          horasExtra = {
            id: `he-${t.id}-${d}`,
            inicio: ini,
            fin,
            horas: Math.round(((fin - ini) / 3600000) * 10) / 10,
            km: Math.round((6 + (semilla % 14)) * 10) / 10,
            esperados,
            enviados: Math.max(0, esperados - (semilla % 3 === 0 ? 1 : 0)),
            lugar: LUGARES_EXTRA[semilla % LUGARES_EXTRA.length], // dónde hizo las horas extras
          };
        }
        // Una sesión en curso hoy (si ya pasó la jornada) para ver cómo se muestra
        if (d === 0 && ti === 2 && ahoraReal.getHours() >= 17 && ahoraReal.getHours() < 22) {
          const ini = new Date(fecha);
          ini.setHours(17, 8, 0, 0);
          const esperados = Math.floor((ahoraReal - ini) / 3600000);
          horasExtra = {
            id: `he-${t.id}-hoy`,
            inicio: ini,
            fin: null,
            horas: Math.round(((ahoraReal - ini) / 3600000) * 10) / 10,
            km: 4.2,
            esperados,
            enviados: esperados,
            lugar: LUGARES_EXTRA[0],
          };
        }
        // Cómo se desplazó ese día: km y minutos a pie y en vehículo
        const kmPie = Math.round((1 + (semilla % 30) / 10) * 10) / 10;
        const desplazamiento = {
          a_pie: { km: kmPie, min: 30 + (semilla % 55) },
          vehiculo: { km: Math.round((km - kmPie) * 10) / 10, min: Math.round(horasMovimiento * 60) },
        };
        lista.push({
          trabajadorId: t.id,
          fecha,
          desplazamiento,
          horasExtra,
          km,
          horasMovimiento,
          velPromedio: Math.round(km / horasMovimiento),
          velMax: Math.max(38 + (semilla % 14), ...picos.map((p) => p.velocidad)),
          picos,
        });
      }
    });
  return lista;
}

export const desempenoDiario = generarDesempeno();
