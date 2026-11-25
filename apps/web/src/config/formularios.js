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
  // Pausas de descanso (por empresa): el trabajador las inicia y se cierran solas al cumplir el tiempo.
  // duracion + unidad ('min' u 'h'); el ícono es el nombre de Ionicons que usa la app.
  //   veces: cuántas veces por jornada (desayuno y almuerzo: 1)
  //   Pausa activa: BOLSA de minutos del día (bolsaMin) que el trabajador reparte como quiera;
  //   su duracion es el máximo por pausa.
  descansos: [
    { id: 'desayuno', texto: 'Desayuno', icono: 'cafe', duracion: 15, unidad: 'min', veces: 1, activo: true },
    { id: 'almuerzo', texto: 'Almuerzo', icono: 'restaurant', duracion: 1, unidad: 'h', veces: 1, activo: true },
    {
      id: 'pausa_activa',
      texto: 'Pausa activa',
      icono: 'body',
      duracion: 10,
      unidad: 'min',
      bolsaMin: 30,
      activo: true,
    },
  ],
  // Tipos de actividad autorizada: solo aparecen en la app cuando se habilitan a un trabajador para una fecha
  tiposActividad: [
    { id: 'capacitacion', texto: 'Capacitación', icono: 'school' },
    { id: 'reunion', texto: 'Reunión', icono: 'people' },
    { id: 'cita_medica', texto: 'Cita médica', icono: 'medkit' },
    { id: 'diligencia', texto: 'Diligencia autorizada', icono: 'document-text' },
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

// Configuración guardada con formatos anteriores (tiposPausa con grupo "otras") → formato actual:
// los descansos quedan como descansos y las "otras" pasan a ser tipos de actividad autorizada
export function normalizarPausas(f) {
  if (!f.tiposPausa) return completarDescansos(f); // ya está en el formato actual
  const viejas = f.tiposPausa ?? [];
  const base = FORMULARIOS_DEFECTO;
  const descansos = base.descansos.map((d) => {
    const v = viejas.find((x) => x.id === d.id);
    if (!v) return d;
    const min = v.duracion != null ? (v.unidad === 'h' ? v.duracion * 60 : v.duracion) : (v.minutos ?? 15);
    return {
      ...d,
      duracion: min >= 60 && min % 60 === 0 ? min / 60 : min,
      unidad: min >= 60 && min % 60 === 0 ? 'h' : 'min',
      activo: v.activo !== false,
    };
  });
  const otras = viejas
    .filter((x) => x.grupo === 'otras' || x.texto?.startsWith('Otras: '))
    .map((x) => ({ id: x.id, texto: x.texto.replace(/^Otras: /, ''), icono: x.icono ?? 'pause' }));
  const { tiposPausa, ...resto } = f;
  return completarDescansos({ ...resto, descansos, tiposActividad: otras.length ? otras : base.tiposActividad });
}

// Completa los datos nuevos (veces por jornada y bolsa de la pausa activa) en configuraciones guardadas antes.
// Si antes se usaba "N pausas activas por jornada", la bolsa queda en N × la duración de cada una.
function completarDescansos(f) {
  if (!f.descansos) return f;
  const { pausasActivasMax, ...resto } = f;
  const descansos = f.descansos.map((d) => {
    const base = FORMULARIOS_DEFECTO.descansos.find((x) => x.id === d.id) ?? {};
    const bolsa =
      d.id === 'pausa_activa' && d.bolsaMin == null && pausasActivasMax != null
        ? { bolsaMin: pausasActivasMax * (d.unidad === 'h' ? d.duracion * 60 : d.duracion) }
        : {};
    return { ...base, ...d, ...bolsa };
  });
  return { ...resto, descansos };
}
