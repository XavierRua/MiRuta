// Datos de ejemplo del trabajador. Se reemplazarán por datos reales de Supabase.
export const yo = {
  nombres: 'Carlos',
  apellidos: 'Restrepo',
  cedula: '1.036.458.221',
  cargo: 'Mensajero',
  empresa: 'Distribuciones Andina S.A.S.',
  grupo: 'Zona Centro',
  telefono: '300 512 8890',
  eps: 'Sura',
  arl: 'Sura',
  tipoSangre: 'O+',
  contactoEmergencia: 'María Restrepo · 300 111 2233',
  licencia: 'A2 · vence 12/08/2029',
};
// Empresa del trabajador. logoUrl: el logo que sube el administrador en la web (null = logo de MiRuta)
export const empresa = {
  nombre: 'Distribuciones Andina S.A.S.',
  logoUrl: null,
};
export const vehiculo = {
  placa: 'ABC12F',
  tipo: 'moto', // 'moto' | 'carro': ícono en el mapa cuando va en vehículo
  propio: true, // vehículo del trabajador (auxilio de rodamiento). Luego lo indicará el preoperacional del día
  descripcion: 'Yamaha FZ 2.0 · 2022 · Azul',
  propietario: 'Propio (recibe auxilio de rodamiento)',
  soat: { fecha: '14/03/2027', estado: 'ok' },
  tecnomecanica: { fecha: '20/01/2027', estado: 'ok' },
};
export const horario = {
  hoy: '7:00 a. m. – 5:00 p. m.',
  semana: [
    { dia: 'Lunes a viernes', horas: '7:00 a. m. – 5:00 p. m.' },
    { dia: 'Sábado', horas: '7:00 a. m. – 12:00 m.' },
    { dia: 'Domingo y festivos', horas: 'Descanso' },
  ],
};
// Horario por día de la semana (0 = domingo). null = no trabaja.
export const horarioSemana = {
  0: null,
  1: { inicio: 7, fin: 17 },
  2: { inicio: 7, fin: 17 },
  3: { inicio: 7, fin: 17 },
  4: { inicio: 7, fin: 17 },
  5: { inicio: 7, fin: 17 },
  6: { inicio: 7, fin: 12 },
};

export const hoy = {
  rastreoActivo: true,
  inicio: '7:00 a. m.',
  km: 42.6,
  ultimoEnvio: 'hace 20 s',
  puntosPendientes: 0,
  bateria: 78,
  geocercaActual: null,
  visitas: [
    { lugar: 'Sede principal', entrada: '7:03', salida: '7:41' },
    { lugar: 'Cliente Centro', entrada: '9:12', salida: '9:48' },
    { lugar: 'Cliente Laureles', entrada: '10:20', salida: '10:55' },
  ],
};
// ---------- Historial de jornadas (ejemplo) ----------
// Lugares donde el trabajador registra entrada y salida (geocercas)
const lugares = [
  { nombre: 'Sede principal', tipo: 'Zona' },
  { nombre: 'Zona Centro', tipo: 'Zona' },
  { nombre: 'Cliente Laureles', tipo: 'Cliente' },
  { nombre: 'Cliente Éxito Colombia', tipo: 'Cliente' },
  { nombre: 'Cliente Clínica El Rosario', tipo: 'Cliente' },
  { nombre: 'Obra Torre Norte', tipo: 'Obra' },
  { nombre: 'Obra Puente Itagüí', tipo: 'Obra' },
];

// Genera ~3 meses de jornadas de lunes a sábado hasta la fecha de hoy.
// Siempre produce los mismos datos para que el ejemplo sea estable.
function generarJornadas() {
  const lista = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  for (let i = 0; i < 90; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - i);
    const dia = fecha.getDay(); // 0 = domingo
    if (dia === 0) continue;
    const semilla = fecha.getDate() * 7 + fecha.getMonth() * 13;
    const sabado = dia === 6;
    const extra = !sabado && semilla % 9 === 0;
    const visitas = [lugares[0]];
    const n = sabado ? 1 : 2 + (semilla % 3);
    for (let k = 1; k <= n; k++) visitas.push(lugares[1 + ((semilla + k * 3) % (lugares.length - 1))]);
    lista.push({
      fecha, // objeto Date (00:00)
      inicio: '7:00',
      fin: i === 0 ? 'en curso' : sabado ? '12:00' : '17:00',
      // Horas extras del día (después de la jornada), con su propio km y reportes
      horasExtra:
        extra && i > 0
          ? {
              inicio: `17:${String(5 + (semilla % 20)).padStart(2, '0')}`,
              fin: `18:${String(30 + (semilla % 25)).padStart(2, '0')}`,
              horas: Math.round((85 + (semilla % 45) - (semilla % 20)) / 6) / 10, // ~1,1 a 2,1 h
              km: Math.round((8 + (semilla % 12)) * 10) / 10,
              reportesEsperados: 1,
              reportesEnviados: semilla % 2,
              lugar: lugares[1 + (semilla % (lugares.length - 1))].nombre, // dónde hizo las horas extras
            }
          : null,
      km: Math.round((sabado ? 18 : 45) * 10 + (semilla % 30) * 10) / 10,
      // Pausas de descanso y actividades autorizadas del día (registro aparte de los reportes)
      pausas: sabado
        ? [{ clase: 'descanso', texto: 'Desayuno', inicio: '9:05', fin: '9:20', minutos: 15 }]
        : [
            { clase: 'descanso', texto: 'Desayuno', inicio: '8:00', fin: '8:15', minutos: 15 },
            {
              clase: 'descanso',
              texto: 'Pausa activa',
              inicio: '10:0' + (semilla % 9),
              fin: '10:1' + (semilla % 9),
              minutos: 10,
            },
            { clase: 'descanso', texto: 'Almuerzo', inicio: '12:00', fin: '13:00', minutos: 60 },
            ...(semilla % 4 === 0
              ? [
                  {
                    clase: 'actividad',
                    texto: 'Capacitación',
                    inicio: '14:00',
                    fin: '15:00',
                    minutos: 60,
                    autorizadaPor: 'Laura Gómez (SST)',
                  },
                ]
              : []),
          ],
      // Cómo se desplazó: km y segundos a pie, en vehículo y quieto
      desplazamiento: {
        a_pie: { km: Math.round((1.2 + (semilla % 25) / 10) * 10) / 10, seg: (35 + (semilla % 50)) * 60 },
        vehiculo: {
          km: Math.round((sabado ? 16 : 42) + (semilla % 30)),
          seg: (sabado ? 70 : 150 + (semilla % 60)) * 60,
        },
        quieto: { km: 0, seg: (sabado ? 120 : 300 + (semilla % 90)) * 60 },
      },
      lugares: [...new Map(visitas.map((l) => [l.nombre, l])).values()],
      // Velocidad promedio (en movimiento) y máxima del día: se guardan al cerrar la jornada
      velPromedio: 22 + (semilla % 9),
      velMax: 41 + ((semilla * 3) % 38),
      // Excesos de velocidad del día (límite de ejemplo: 60 km/h), con hora, ubicación y velocidad
      excesos:
        41 + ((semilla * 3) % 38) > 60
          ? [
              {
                id: `exc-${i}`,
                fecha: new Date(new Date(fecha).setHours(8 + (semilla % 8), (semilla * 7) % 60)),
                velocidad: 41 + ((semilla * 3) % 38),
                limite: 60,
                lat: 6.24 + (semilla % 9) * 0.004,
                lng: -75.59 + (semilla % 7) * 0.004,
              },
            ]
          : [],
      reportesEsperados: sabado ? 5 : 10,
      reportesEnviados: i === 0 ? 0 : (sabado ? 5 : 10) - (semilla % 4 === 0 ? 1 : 0),
    });
  }
  return lista;
}

export const jornadas = generarJornadas();

// ---------- Reportes de actividad de días anteriores (ejemplo) ----------
const tareas = [
  'Entrega de documentos en recepción y firma de recibido.',
  'Recogida de paquetes para despacho de la tarde.',
  'Visita al cliente para revisión del pedido pendiente.',
  'Instalación y prueba del equipo en el punto de venta.',
  'Desplazamiento entre clientes; tráfico pesado en la Avenida 80.',
  'Inventario rápido de mercancía en bodega.',
  'Reunión con el supervisor de obra para coordinar entregas.',
  'Entrega de material en obra y verificación de cantidades.',
];

// Reportes de ejemplo de una jornada pasada (sin fotos reales).
// Devuelve una fila por cada hora: las que no se enviaron quedan como "no_reporto".
export function reportesDeEjemplo(jornada) {
  const lista = [];
  const faltan = jornada.reportesEsperados - jornada.reportesEnviados;
  for (let k = 0; k < jornada.reportesEsperados; k++) {
    const inicio = new Date(jornada.fecha);
    inicio.setHours(7 + k, 0, 0, 0);
    const franja = `${7 + k}:00 – ${8 + k}:00`;
    const lugar = jornada.lugares[k % jornada.lugares.length];
    // 12:00 – 13:00: toda la hora en almuerzo → "En pausa – Almuerzo" (no necesita reporte)
    if (7 + k === 12 && jornada.fecha.getDay() !== 6) {
      lista.push({
        id: `${inicio.toISOString()}-p`,
        franjaId: inicio.toISOString(),
        franja,
        estado: 'en_pausa',
        pausa: 'Almuerzo',
        ejemplo: true,
      });
      continue;
    }
    // 8:00 – 9:00: desayuno de 8:00 a 8:15 → se envió a las 9:10, dentro de la ventana extendida
    const desayuno = 7 + k === 8;
    // horas sin reporte de ese día (siempre las mismas para que el ejemplo sea estable)
    if (!desayuno && faltan > 0 && k % Math.ceil(jornada.reportesEsperados / faltan) === jornada.fecha.getDate() % 3) {
      lista.push({
        id: `${inicio.toISOString()}-x`,
        franjaId: inicio.toISOString(),
        franja,
        estado: 'no_reporto',
        ejemplo: true,
      });
      continue;
    }
    lista.push({
      id: `${inicio.toISOString()}-${k}`,
      franjaId: inicio.toISOString(),
      franja,
      enviadoEn: new Date(inicio.getTime() + (desayuno ? 70 : 20 + ((k * 7) % 35)) * 60 * 1000),
      estado: 'a_tiempo',
      ...(desayuno ? { extensionMin: 15, extensionTexto: 'Extendido +15 min por desayuno' } : {}),
      descripcion: tareas[(k + jornada.fecha.getDate()) % tareas.length],
      lugar: lugar.nombre,
      ubicacion: { lat: 6.25 + k * 0.002, lng: -75.57 + k * 0.002, precisionM: 8, direccion: null, simulada: false },
      fotosTarea: [],
      selfie: null,
      ejemplo: true,
    });
  }
  return lista.reverse();
}

// ---------- Cuentas de ejemplo para activar el celular ----------
// En la versión real, el administrador genera el código de activación desde el panel web.
export const cuentasDemo = [
  {
    codigoEmpresa: 'ANDINA',
    empresa: 'Distribuciones Andina S.A.S.',
    cedula: '1036458221',
    codigoActivacion: '482913',
    trabajador: { nombres: 'Carlos', apellidos: 'Restrepo' },
    celularVinculado: null, // libre: se puede activar
  },
  {
    codigoEmpresa: 'ANDINA',
    empresa: 'Distribuciones Andina S.A.S.',
    cedula: '98765432',
    codigoActivacion: '715204',
    trabajador: { nombres: 'Diego', apellidos: 'Muñoz' },
    celularVinculado: 'Samsung Galaxy A54', // ya tiene otro celular: se rechaza y se avisa
  },
];

// ---------- Documentos adicionales (los sube SST desde la web) ----------
// Fechas relativas a hoy para ver los tres colores: vigente, próximo a vencer y vencido.
const enDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const documentosAdicionales = {
  arl: { vence: enDias(190), detalle: 'Sura · riesgo II', subidoPor: 'Laura Gómez (SST)', subidoEn: enDias(-175) },
  planilla: {
    vence: enDias(9),
    detalle: 'Pago del mes en curso',
    subidoPor: 'Laura Gómez (SST)',
    subidoEn: enDias(-21),
  },
  alturas: { vence: enDias(-4), detalle: 'Nivel avanzado', subidoPor: 'Laura Gómez (SST)', subidoEn: enDias(-369) },
  confinados: null, // aún no lo ha subido SST
  examenes: {
    vence: enDias(240),
    detalle: 'Examen periódico · apto',
    subidoPor: 'Laura Gómez (SST)',
    subidoEn: enDias(-125),
  },
};

// Vehículos de la empresa (para el preoperacional cuando no usa el propio)
export const vehiculosEmpresa = [
  { placa: 'EMP12A', clase: 'moto', descripcion: 'Honda XR 150 · 2023', picoPlaca: [2] },
  { placa: 'KLM345', clase: 'carro', descripcion: 'Renault Kangoo · 2021', picoPlaca: [4] },
  { placa: 'TRK678', clase: 'camion', descripcion: 'Chevrolet NHR · 2020', picoPlaca: [1] },
];
