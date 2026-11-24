// Capa de acceso a datos.
// Hoy devuelve datos de ejemplo; cuando conectemos Supabase, solo cambia este archivo
// y las pantallas siguen funcionando igual.
import { porcentaje } from '../utils/eficiencia';
import { aTextoFecha } from '../utils/fechas';
import {
  alertas,
  empresas,
  eventosGeocerca,
  geocercas,
  horarios,
  jornadasEjemplo,
  reportesActividad,
  desempenoDiario,
  recorridoEjemplo,
  trabajadores,
  vehiculos,
  recorridoTramosEjemplo,
} from '../data/mock';

// Reportes esperados y enviados por trabajador y día (índice para calcular la eficiencia rápido)
const reportesPorDia = new Map();
reportesActividad.forEach((r) => {
  const clave = `${r.trabajadorId}|${aTextoFecha(r.fecha)}`;
  const c = reportesPorDia.get(clave) ?? { esperados: 0, enviados: 0 };
  c.esperados += 1;
  if (r.estado === 'a_tiempo') c.enviados += 1;
  reportesPorDia.set(clave, c);
});

const enRango = (fecha, desde, hasta) => fecha >= desde && fecha <= hasta;

export const api = {
  getEmpresas: () => empresas,
  // Cada trabajador con su modo de desplazamiento actual y el tipo de su vehículo (moto / carro).
  // Con GPS real: el modo llega con cada punto (lo detecta la app con los pasos y la velocidad).
  getTrabajadores: (empresaId) =>
    trabajadores
      .filter((t) => t.empresaId === empresaId)
      .map((t) => ({
        ...t,
        vehiculoTipo: vehiculos.find((v) => v.placa === t.vehiculoPlaca)?.tipo ?? null,
        modo:
          t.modo ??
          (['apagado', 'sin_reporte', 'fuera_horario'].includes(t.estado)
            ? null
            : t.velocidad >= 12
              ? 'vehiculo'
              : t.velocidad >= 2
                ? 'a_pie'
                : 'quieto'),
      })),
  getVehiculos: (empresaId) => vehiculos.filter((v) => v.empresaId === empresaId),
  getGeocercas: () => geocercas,
  getEventosGeocerca: () => eventosGeocerca,
  // Alertas fijas de ejemplo + excesos de velocidad de hoy según el límite configurado
  getAlertas: (limiteVelocidad = 60) => {
    const hoy = aTextoFecha(new Date());
    const excesos = desempenoDiario
      .filter((d) => aTextoFecha(d.fecha) === hoy)
      .flatMap((d) =>
        d.picos
          .filter((p) => p.velocidad > limiteVelocidad)
          .map((p) => {
            const t = trabajadores.find((x) => x.id === d.trabajadorId);
            return {
              id: `exceso-${d.trabajadorId}-${p.hora}`,
              tipo: 'exceso_velocidad',
              trabajador: `${t.nombres} ${t.apellidos}`,
              mensaje: `${p.velocidad} km/h en ${p.via} (límite ${limiteVelocidad} km/h) · ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`,
              hora: p.hora,
              estado: 'abierta',
            };
          }),
      );
    // Avisos de inicio y fin de horas extras de hoy
    const extras = desempenoDiario
      .filter((d) => aTextoFecha(d.fecha) === hoy && d.horasExtra)
      .flatMap((d) => {
        const t = trabajadores.find((x) => x.id === d.trabajadorId);
        const nombre = `${t.nombres} ${t.apellidos}`;
        const hora = (f) => `${f.getHours()}:${String(f.getMinutes()).padStart(2, '0')}`;
        const lista = [
          {
            id: `hei-${d.horasExtra.id}`,
            tipo: 'horas_extra_inicio',
            trabajador: nombre,
            mensaje: `Inició horas extras a las ${hora(d.horasExtra.inicio)} (hora del servidor)`,
            hora: hora(d.horasExtra.inicio),
            estado: d.horasExtra.fin ? 'vista' : 'abierta',
          },
        ];
        if (d.horasExtra.fin)
          lista.push({
            id: `hef-${d.horasExtra.id}`,
            tipo: 'horas_extra_fin',
            trabajador: nombre,
            mensaje: `Finalizó horas extras a las ${hora(d.horasExtra.fin)} · ${String(d.horasExtra.horas).replace('.', ',')} h · ${d.horasExtra.km} km`,
            hora: hora(d.horasExtra.fin),
            estado: 'abierta',
          });
        return lista;
      });
    return [...excesos, ...extras, ...alertas].sort((a, b) =>
      b.hora.padStart(5, '0').localeCompare(a.hora.padStart(5, '0')),
    );
  },
  getJornadas: () => jornadasEjemplo,
  getRecorrido: () => recorridoEjemplo,
  getRecorridoTramos: () => recorridoTramosEjemplo(),
  getHorarios: () => horarios,
  // Reportes de actividad filtrados por trabajador ('' = todos) y rango de fechas (ambas incluidas)
  getReportes: ({ empresaId, trabajadorId, desde, hasta }) => {
    const ids = new Set(trabajadores.filter((t) => t.empresaId === empresaId).map((t) => t.id));
    return reportesActividad.filter(
      (r) =>
        ids.has(r.trabajadorId) &&
        (!trabajadorId || r.trabajadorId === trabajadorId) &&
        r.fecha >= desde &&
        r.fecha <= hasta,
    );
  },

  // Indicadores por trabajador y por día: km, velocidades, excesos y eficiencia de reportes
  getIndicadoresDiarios: ({ empresaId, trabajadorId, desde, hasta, limiteVelocidad }) => {
    const ids = new Set(trabajadores.filter((t) => t.empresaId === empresaId).map((t) => t.id));
    return desempenoDiario
      .filter(
        (d) =>
          ids.has(d.trabajadorId) &&
          (!trabajadorId || d.trabajadorId === trabajadorId) &&
          enRango(d.fecha, desde, hasta),
      )
      .map((d) => {
        const r = reportesPorDia.get(`${d.trabajadorId}|${aTextoFecha(d.fecha)}`) ?? { esperados: 0, enviados: 0 };
        return {
          ...d,
          excesos: d.picos.filter((p) => p.velocidad > limiteVelocidad),
          esperados: r.esperados,
          enviados: r.enviados,
          eficiencia: porcentaje(r.enviados, r.esperados),
        };
      })
      .sort((a, b) => b.fecha - a.fecha);
  },

  // Suma los días de cada trabajador (para el resumen comparativo o los totales de un trabajador)
  resumirIndicadores: (dias) => {
    const porTrabajador = new Map();
    dias.forEach((d) => {
      const r = porTrabajador.get(d.trabajadorId) ?? {
        trabajadorId: d.trabajadorId,
        jornadas: 0,
        km: 0,
        horas: 0,
        velMax: 0,
        excesos: 0,
        esperados: 0,
        enviados: 0,
      };
      r.jornadas += 1;
      r.km += d.km;
      r.horas += d.horasMovimiento;
      r.velMax = Math.max(r.velMax, d.velMax);
      r.excesos += d.excesos.length;
      r.esperados += d.esperados;
      r.enviados += d.enviados;
      porTrabajador.set(d.trabajadorId, r);
    });
    return [...porTrabajador.values()].map((r) => ({
      ...r,
      km: Math.round(r.km * 10) / 10,
      velPromedio: r.horas > 0 ? Math.round(r.km / r.horas) : 0,
      eficiencia: porcentaje(r.enviados, r.esperados),
    }));
  },

  // Sesiones de horas extras por trabajador y rango de fechas (las más recientes primero)
  getHorasExtra: ({ empresaId, trabajadorId, desde, hasta }) => {
    const ids = new Set(trabajadores.filter((t) => t.empresaId === empresaId).map((t) => t.id));
    return desempenoDiario
      .filter(
        (d) =>
          d.horasExtra &&
          ids.has(d.trabajadorId) &&
          (!trabajadorId || d.trabajadorId === trabajadorId) &&
          enRango(d.fecha, desde, hasta),
      )
      .map((d) => ({ ...d.horasExtra, trabajadorId: d.trabajadorId, fecha: d.fecha }))
      .sort((a, b) => b.inicio - a.inicio);
  },
};
