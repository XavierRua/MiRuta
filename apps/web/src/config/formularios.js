// Valores por defecto de los formularios del trabajador (los mismos de la app: apps/mobile/src/config/formularios.js).
// El administrador los cambia en Configuración → Formularios y pausas.
export const FORMULARIOS_DEFECTO = {
  preguntasSalud: [
    {
      id: 'animo',
      texto: '¿Cómo te sientes hoy?',
      tipo: 'opciones',
      opciones: ['Bien', 'Regular', 'Mal'],
      alertaSi: 'Mal',
    },
    { id: 'apto', texto: '¿Estás en condiciones de trabajar?', tipo: 'si_no', alertaSi: 'No', fija: true },
    { id: 'dolor', texto: '¿Tienes algún dolor, malestar o lesión?', tipo: 'si_no', alertaSi: '' },
    { id: 'medicamento', texto: '¿Tomaste algún medicamento que afecte tu atención?', tipo: 'si_no', alertaSi: 'Sí' },
    { id: 'observaciones', texto: 'Observaciones (opcional)', tipo: 'texto', alertaSi: '' },
  ],
  itemsPreoperacional: [
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
      fija: true,
    },
  ],
  // Pausas: grupo "principal" (tarjeta propia en la app) u "otras" (dentro de la tarjeta Otras).
  // duracion + unidad ('min' u 'h'); el ícono es el nombre de Ionicons que usa la app.
  tiposPausa: [
    { id: 'desayuno', texto: 'Desayuno', icono: 'cafe', grupo: 'principal', duracion: 15, unidad: 'min', activo: true },
    {
      id: 'almuerzo',
      texto: 'Almuerzo',
      icono: 'restaurant',
      grupo: 'principal',
      duracion: 1,
      unidad: 'h',
      activo: true,
    },
    {
      id: 'pausa_activa',
      texto: 'Pausa activa',
      icono: 'body',
      grupo: 'principal',
      duracion: 10,
      unidad: 'min',
      activo: true,
      fija: true,
    },
    {
      id: 'capacitacion',
      texto: 'Capacitación',
      icono: 'school',
      grupo: 'otras',
      duracion: 1,
      unidad: 'h',
      activo: true,
    },
    { id: 'reunion', texto: 'Reunión', icono: 'people', grupo: 'otras', duracion: 30, unidad: 'min', activo: true },
    {
      id: 'cita_medica',
      texto: 'Cita médica',
      icono: 'medkit',
      grupo: 'otras',
      duracion: 5,
      unidad: 'h',
      activo: true,
    },
    {
      id: 'diligencia',
      texto: 'Diligencia autorizada',
      icono: 'document-text',
      grupo: 'otras',
      duracion: 30,
      unidad: 'min',
      activo: true,
    },
  ],
  pausaActivaCadaMin: 120,
  limiteFormulariosMin: 30,
  saludSalidaAntesMin: 30,
};

// Íconos que puede elegir el administrador para una pausa (nombres de Ionicons, los mismos de la app)
export const ICONOS_PAUSA = [
  ['cafe', 'Café'],
  ['restaurant', 'Comida'],
  ['body', 'Pausa activa'],
  ['school', 'Capacitación'],
  ['people', 'Reunión'],
  ['medkit', 'Salud / médico'],
  ['document-text', 'Trámite'],
  ['water', 'Hidratación'],
  ['briefcase', 'Trabajo'],
  ['car', 'Desplazamiento'],
  ['book', 'Estudio'],
  ['pause', 'Pausa'],
];

export const minutosDePausa = (p) => (p.unidad === 'h' ? Math.round(p.duracion * 60) : p.duracion);

// 30 → "30 min" · 60 → "1 h" · 90 → "1 h 30 min"
export function textoDuracion(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// Pausas guardadas con el formato anterior ({ texto: 'Otras: X', minutos }) → formato actual
export function normalizarPausas(lista = []) {
  return lista.map((p) => {
    if (p.duracion != null) return p;
    const otras = p.texto?.startsWith('Otras: ');
    const min = p.minutos ?? 15;
    return {
      id: p.id,
      texto: otras ? p.texto.slice(7) : p.texto,
      icono: p.icono ?? 'pause',
      grupo: otras ? 'otras' : 'principal',
      duracion: min >= 60 && min % 60 === 0 ? min / 60 : min,
      unidad: min >= 60 && min % 60 === 0 ? 'h' : 'min',
      activo: true,
      fija: p.id === 'pausa_activa' || undefined,
    };
  });
}
