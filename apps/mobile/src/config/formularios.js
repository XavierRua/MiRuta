// Formularios del inicio y fin de jornada, pausas y reglas relacionadas.
// Son los valores por defecto: con Supabase el administrador de cada empresa los configura desde la web
// (Configuración → Formularios y pausas) y la app los lee al iniciar (tablas de la migración 0014).

// Reporte de estado de salud (al iniciar y al terminar la jornada).
// tipo: 'opciones' | 'si_no' | 'texto'. alertaSi: respuesta que genera una alerta inmediata.
// clave 'apto' = "¿Estás en condiciones de trabajar?": si responde No, la novedad es "no apto".
export const PREGUNTAS_SALUD = [
  {
    id: 'animo',
    texto: '¿Cómo te sientes hoy?',
    tipo: 'opciones',
    opciones: ['Bien', 'Regular', 'Mal'],
    alertaSi: 'Mal',
  },
  { id: 'apto', texto: '¿Estás en condiciones de trabajar?', tipo: 'si_no', alertaSi: 'No', obligatoria: true },
  { id: 'dolor', texto: '¿Tienes algún dolor, malestar o lesión?', tipo: 'si_no' },
  { id: 'medicamento', texto: '¿Tomaste algún medicamento que afecte tu atención?', tipo: 'si_no', alertaSi: 'Sí' },
  { id: 'observaciones', texto: 'Observaciones (opcional)', tipo: 'texto', opcional: true },
];

// Preoperacional: lista de verificación del vehículo. aplica: tipos de vehículo donde se pregunta.
// 'documentos' se revisa solo con los documentos del perfil (SOAT y técnico-mecánica vigentes).
export const ITEMS_PREOPERACIONAL = [
  { id: 'frenos', texto: 'Frenos', aplica: ['moto', 'carro', 'camion'] },
  { id: 'luces', texto: 'Luces (altas, bajas, direccionales, stop)', aplica: ['moto', 'carro', 'camion'] },
  { id: 'llantas', texto: 'Llantas (presión y desgaste)', aplica: ['moto', 'carro', 'camion'] },
  { id: 'espejos', texto: 'Espejos', aplica: ['moto', 'carro', 'camion'] },
  { id: 'pito', texto: 'Pito', aplica: ['moto', 'carro', 'camion'] },
  { id: 'cadena', texto: 'Cadena y kit de arrastre', aplica: ['moto'] },
  { id: 'casco', texto: 'Casco y chaleco reflectivo', aplica: ['moto'] },
  { id: 'cinturones', texto: 'Cinturones de seguridad', aplica: ['carro', 'camion'] },
  { id: 'botiquin', texto: 'Botiquín y extintor', aplica: ['carro', 'camion'] },
  {
    id: 'documentos',
    texto: 'Documentos al día (SOAT y técnico-mecánica)',
    aplica: ['moto', 'carro', 'camion'],
    automatico: true,
  },
];

// ---------- Pausas de descanso y actividades autorizadas ----------
// Las configura en la web el perfil con el permiso "web.pausas.configurar" (administrador, y supervisor o SST si
// el administrador se lo da): Configuración → Pausas y descansos. La app las recibe y arma las tarjetas.
// Estos son los valores de ejemplo mientras no hay servidor.
//   duración: `minutos` o `horas` (se aceptan decimales: 1.5 = 1 h 30 min); la web envía duracion + unidad
//   activo: false = no se muestra en la app

// Pausas de descanso: el trabajador las inicia cuando quiere; se cierran solas al cumplir el tiempo (alarma).
//   veces: cuántas veces por jornada (desayuno y almuerzo: 1 → no se pueden repetir)
//   Pausa activa = BOLSA de minutos del día (bolsaMin, p. ej. 30): las toma cuando quiera y del largo que quiera;
//   lo que usa se descuenta de la bolsa. `minutos` es el máximo por pausa (que no se tome los 30 de una vez).
export const DESCANSOS_EJEMPLO = [
  { id: 'desayuno', texto: 'Desayuno', icono: 'cafe', minutos: 15, veces: 1 },
  { id: 'almuerzo', texto: 'Almuerzo', icono: 'restaurant', horas: 1, veces: 1 },
  { id: 'pausa_activa', texto: 'Pausa activa', icono: 'body', minutos: 10, bolsaMin: 30 },
];

// Tipos de actividad autorizada. NO aparecen solas: solo cuando un perfil con el permiso
// "web.actividades.autorizar" se la habilita a un trabajador para una fecha (con tiempo libre o asignado).
export const TIPOS_ACTIVIDAD_EJEMPLO = [
  { id: 'capacitacion', texto: 'Capacitación', icono: 'school' },
  { id: 'reunion', texto: 'Reunión', icono: 'people' },
  { id: 'cita_medica', texto: 'Cita médica', icono: 'medkit' },
  { id: 'diligencia', texto: 'Diligencia autorizada', icono: 'document-text' },
];

// Duración en minutos: { minutos }, { horas } o { duracion, unidad: 'min' | 'h' } (formato de la web)
export const duracionMin = (p) =>
  p.minutos ??
  (p.duracion != null ? Math.round(p.unidad === 'h' ? p.duracion * 60 : p.duracion) : Math.round((p.horas ?? 0) * 60));

// Lista de descansos (de la web o del servidor) → tarjetas de la app (solo los activos, con sus minutos)
export function armarDescansos(lista = []) {
  return lista.filter((p) => p.activo !== false).map((p) => ({ ...p, minutos: duracionMin(p) }));
}

export const TIPOS_PAUSA = armarDescansos(DESCANSOS_EJEMPLO);

// 30 → "30 min" · 60 → "1 h" · 90 → "1 h 30 min" · 300 → "5 h"
export function textoDuracion(min) {
  min = Math.round(min);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const REGLAS_JORNADA = {
  pausaActivaCadaMin: 120, // recordatorio con sonido para hacer pausa activa cada 2 horas
  limiteFormulariosMin: 30, // si a los 30 min del inicio no ha diligenciado salud y preoperacional: alerta
  saludSalidaAntesMin: 30, // el reporte de salud de salida se habilita 30 min antes del fin del horario
  // Ingresos y batería (los valores reales los configura el administrador en la web)
  toleranciaLlegadaMin: 10, // primer ingreso del día más de 10 min después del inicio del horario → llegada tarde
  bateriaBajaPct: 20, // por debajo de este nivel (y sin cargar) se le avisa al trabajador y queda registrado
};
