import { porcentaje } from './eficiencia';

// Cálculos de los filtros del historial (horas extras, kilometraje, eficiencia y excesos).
// Usan los días que ya entrega api.getIndicadoresDiarios: no cambian cómo se obtienen.
export const FILTROS = [
  { id: 'jornadas', texto: 'Jornadas' },
  { id: 'horasExtra', texto: 'Horas extras' },
  { id: 'km', texto: 'Kilometraje' },
  { id: 'eficiencia', texto: 'Eficiencia' },
  { id: 'excesos', texto: 'Excesos de velocidad' },
];

export const hhmm = (f) => (f ? `${f.getHours()}:${String(f.getMinutes()).padStart(2, '0')}` : 'en curso');
export const fechaCorta = (d) => d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
export const coma = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
const kmDia = (d) => d.km + (d.horasExtra?.km ?? 0);
const promedio = (l) => (l.length ? Math.round(l.reduce((t, x) => t + x, 0) / l.length) : null);

// Total del período (todos los días que llegan)
export function totalDe(tipo, dias) {
  if (tipo === 'horasExtra') {
    const d = dias.filter((x) => x.horasExtra);
    return { valor: d.reduce((t, x) => t + x.horasExtra.horas, 0), dias: d.length };
  }
  if (tipo === 'km') return { valor: dias.reduce((t, x) => t + kmDia(x), 0), dias: dias.length };
  if (tipo === 'eficiencia') {
    const d = dias.filter((x) => x.esperados > 0);
    return {
      valor: promedio(d.map((x) => porcentaje(x.enviados, x.esperados))),
      dias: d.length,
      enviados: d.reduce((t, x) => t + x.enviados, 0),
      esperados: d.reduce((t, x) => t + x.esperados, 0),
    };
  }
  if (tipo === 'excesos') {
    const l = dias.flatMap((x) => x.excesos);
    return {
      valor: l.length,
      dias: dias.filter((x) => x.excesos.length).length,
      velMax: Math.max(0, ...l.map((e) => e.velocidad)),
    };
  }
  return { valor: 0, dias: 0 };
}

// Resumen comparativo: una fila por trabajador, ordenado de mayor a menor
// (en eficiencia, el mejor arriba; en excesos, el que más tiene arriba)
export function comparativo(tipo, dias, trabajadores) {
  return trabajadores
    .map((t) => ({
      t,
      ...totalDe(
        tipo,
        dias.filter((d) => d.trabajadorId === t.id),
      ),
    }))
    .sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1));
}

// Filas de detalle por día (y por exceso, en Excesos)
export function detalleDe(tipo, dias) {
  if (tipo === 'horasExtra')
    return dias
      .filter((d) => d.horasExtra)
      .map((d) => ({
        d,
        inicio: hhmm(d.horasExtra.inicio),
        fin: hhmm(d.horasExtra.fin),
        horas: d.horasExtra.horas,
        lugar: d.horasExtra.lugar,
      }));
  if (tipo === 'km') return dias.map((d) => ({ d, jornada: d.km, extra: d.horasExtra?.km ?? 0, total: kmDia(d) }));
  if (tipo === 'eficiencia')
    return dias.filter((d) => d.esperados > 0).map((d) => ({ d, pct: porcentaje(d.enviados, d.esperados) }));
  if (tipo === 'excesos') return dias.flatMap((d) => d.excesos.map((e) => ({ d, e })));
  return [];
}

// Tablas para Excel y PDF: [encabezados, ...filas]
export function tablasParaExportar(tipo, dias, trabajadores, persona, todos) {
  const quien = (d) => {
    const t = persona(d.trabajadorId);
    return `${t.nombres} ${t.apellidos}`;
  };
  const conT = (enc, fila) => (todos ? [enc, ...fila] : fila);
  const comp = comparativo(tipo, dias, trabajadores);
  const encComp = {
    horasExtra: ['Trabajador', 'Días con horas extras', 'Total horas extras'],
    km: ['Trabajador', 'Jornadas', 'Km totales', 'Promedio km/día'],
    eficiencia: ['Trabajador', 'Días', 'Reportes a tiempo', 'Reportes esperados', 'Eficiencia promedio %'],
    excesos: ['Trabajador', 'Días con excesos', 'Excesos', 'Velocidad máxima km/h'],
  }[tipo];
  const filaComp = (c) =>
    ({
      horasExtra: [c.dias, Math.round(c.valor * 10) / 10],
      km: [c.dias, Math.round(c.valor * 10) / 10, c.dias ? Math.round((c.valor / c.dias) * 10) / 10 : 0],
      eficiencia: [c.dias, c.enviados, c.esperados, c.valor ?? ''],
      excesos: [c.dias, c.valor, c.velMax || ''],
    })[tipo];
  const encDet = {
    horasExtra: ['Fecha', 'Inicio', 'Fin', 'Duración (h)', 'Lugar'],
    km: ['Fecha', 'Km jornada', 'Km horas extras', 'Km total'],
    eficiencia: ['Fecha', 'Reportes a tiempo', 'Reportes esperados', 'Eficiencia %'],
    excesos: ['Fecha', 'Hora', 'Vía', 'Latitud', 'Longitud', 'Velocidad km/h'],
  }[tipo];
  const filaDet = (x) =>
    ({
      horasExtra: () => [fechaCorta(x.d.fecha), x.inicio, x.fin, x.horas, x.lugar?.nombre ?? ''],
      km: () => [fechaCorta(x.d.fecha), x.jornada, x.extra, Math.round(x.total * 10) / 10],
      eficiencia: () => [fechaCorta(x.d.fecha), x.d.enviados, x.d.esperados, x.pct],
      excesos: () => [
        fechaCorta(x.d.fecha),
        x.e.hora,
        x.e.via,
        +x.e.lat.toFixed(5),
        +x.e.lng.toFixed(5),
        x.e.velocidad,
      ],
    })[tipo]();
  return [
    ...(todos
      ? [
          {
            titulo: 'Resumen comparativo',
            filas: [encComp, ...comp.map((c) => [`${c.t.nombres} ${c.t.apellidos}`, ...filaComp(c)])],
          },
        ]
      : []),
    {
      titulo: 'Detalle por día',
      filas: [conT('Trabajador', encDet), ...detalleDe(tipo, dias).map((x) => conT(quien(x.d), filaDet(x)))],
    },
  ];
}
