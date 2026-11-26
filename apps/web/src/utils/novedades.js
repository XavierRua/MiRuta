import { aTextoFecha } from './fechas';

// Datos del inicio/fin de jornada del trabajador: salud, preoperacional, pausas, incidentes, GPS apagados
// y ausentismo. En la demo se inventan siempre iguales por trabajador y día; con Supabase salen de las
// tablas de 0014 (reportes_salud, preoperacionales, pausas, incidentes, apagados_gps).
const semilla = (t) => [...t].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100003, 7);
const hm = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
const FIN_JORNADA = 17 * 60;
const TIPOS_VEH = { Moto: 'moto', Carro: 'carro', Camioneta: 'camion', Camion: 'camion' };

// config = { descansos, actividades }: tiempos configurados y actividades autorizadas desde la web
export function generarNovedades(trabajadores, desde, hasta, apagadosManuales = [], vehiculos = [], config = {}) {
  const descansos = config.descansos ?? [];
  const actividades = config.actividades ?? [];
  const cfg = (id) => {
    const d = descansos.find((x) => x.id === id && x.activo !== false);
    return d && { texto: d.texto, min: d.unidad === 'h' ? Math.round(d.duracion * 60) : d.duracion, bolsa: d.bolsaMin };
  };
  const r = {
    salud: [],
    preoperacional: [],
    pausas: [],
    incidentes: [],
    apagados: [],
    notificaciones: [],
    ingresos: [],
  };
  const tolerancia = config.toleranciaLlegadaMin ?? 10;
  const umbralBateria = config.bateriaBajaPct ?? 20;
  const hoyTexto = aTextoFecha(new Date());
  for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) continue;
    const fecha = new Date(d);
    const f = aTextoFecha(fecha);
    const esHoy = f === hoyTexto;
    const sabado = fecha.getDay() === 6;
    for (const t of trabajadores) {
      if (t.estado === 'fuera_horario' && esHoy) continue;
      const s = semilla(`${t.id}${f}`);
      const persona = `${t.nombres} ${t.apellidos}`;
      const base = { fecha, trabajadorId: t.id, persona };

      // Ingresos a la app con PIN (con batería y ubicación) y avisos de batería baja
      {
        const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();
        const tardeDemo = s % 10 === 0 ? 24 : s % 17 === 0 ? 12 : s % 29 === 0 ? 85 : 0; // minutos después de las 7:00
        const primero = tardeDemo ? 7 * 60 + tardeDemo : 6 * 60 + 48 + (s % 11);
        const bat0 = 68 + (s % 31);
        const ubic = `${(t.lat + (s % 5) * 0.0004).toFixed(5)}, ${(t.lng - (s % 3) * 0.0004).toFixed(5)}`;
        const ev = (min, evento, bateria, extra = {}) =>
          (!esHoy || min <= ahoraMin) &&
          r.ingresos.push({
            ...base,
            minutos: min,
            hora: hm(min),
            evento,
            bateria,
            cargando: false,
            ubicacion: ubic,
            ...extra,
          });
        if (s % 13 === 0) ev(primero - 1, 'PIN incorrecto', bat0);
        ev(primero, 'Ingreso', bat0, {
          primero: true,
          minutosTarde: primero - 7 * 60 > tolerancia ? primero - 7 * 60 : null,
        });
        const otros = 1 + (s % 3);
        for (let k = 1; k <= otros; k++) {
          const min = primero + k * (sabado ? 70 : 150) + (s % 20);
          ev(min, 'Ingreso', Math.max(5, bat0 - k * (12 + (s % 6))), { cargando: k === otros && s % 4 === 0 });
        }
        if (!sabado && s % 8 === 0) ev(15 * 60 + (s % 40), 'Batería baja', Math.max(5, umbralBateria - 2 - (s % 5)));
      }

      // Salud al iniciar (y al terminar, salvo hoy)
      const noApto = s % 100 < 4;
      const llegaTarde = s % 100 >= 96; // diligenció después del límite → alerta "formularios pendientes"
      const horaSalud = 7 * 60 + 3 + (s % 20) + (llegaTarde ? 40 : 0);
      r.salud.push({
        ...base,
        momento: 'Inicio',
        hora: hm(horaSalud),
        animo: noApto ? 'Mal' : ['Bien', 'Bien', 'Regular'][s % 3],
        apto: noApto ? 'No' : 'Sí',
        medicamento: s % 23 === 0 ? 'Sí' : 'No',
        observaciones: noApto ? 'Fiebre y dolor de cabeza desde anoche' : '',
        alerta: noApto || s % 23 === 0,
        tarde: llegaTarde,
      });
      if (!esHoy && !noApto)
        r.salud.push({
          ...base,
          momento: 'Salida',
          hora: hm((sabado ? 12 : 17) * 60 - 10 + (s % 9)),
          animo: s % 31 === 0 ? 'Regular' : 'Bien',
          apto: 'Sí',
          medicamento: 'No',
          observaciones: s % 31 === 0 ? 'Leve dolor de espalda' : '',
          alerta: false,
          tarde: false,
        });

      // Preoperacional
      const veh = vehiculos.find((v) => v.placa === t.vehiculoPlaca);
      const empresa = s % 9 === 0;
      const fallas = s % 100 < 6 ? [['Frenos', 'Luces', 'Llantas'][s % 3]] : [];
      if (!noApto)
        r.preoperacional.push({
          ...base,
          hora: hm(horaSalud + 4),
          uso: t.vehiculoPlaca ? (empresa ? 'Empresa' : 'Propio') : 'Sin vehículo',
          placa: t.vehiculoPlaca ? (empresa ? 'KLM345' : t.vehiculoPlaca) : '—',
          clase: empresa ? 'carro' : (TIPOS_VEH[veh?.tipo] ?? 'moto'),
          fallas,
          alerta: fallas.length > 0,
        });

      // Pausas de descanso (desayuno, almuerzo, pausa activa) y actividades autorizadas
      if (!noApto) {
        const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();
        const desc = (id) => cfg(id);
        const items = sabado
          ? [['desayuno', 9 * 60 + (s % 10)]]
          : [
              ['desayuno', 8 * 60 + (s % 5 === 0 ? 20 : 0)],
              // Pausa activa: varias cortas que salen de la bolsa del día (p. ej. 30 min)
              ['pausa_activa', 9 * 60 + 40 + (s % 9), 5 + (s % 4)],
              ['pausa_activa', 10 * 60 + 50 + (s % 9), 8],
              ['almuerzo', 12 * 60],
              ['pausa_activa', 15 * 60 + (s % 9), 4 + (s % 6)],
              ['pausa_activa', 16 * 60 + 10, 5],
            ];
        const usado = {};
        for (const [id, ini, durDemo] of items) {
          const d = desc(id);
          if (!d) continue;
          const volvioAntes = s % 7 === 0 && !durDemo && d.min > 5;
          const min = durDemo ?? (volvioAntes ? d.min - 3 : d.min);
          if (esHoy && ini + min > ahoraMin) continue;
          const antes = usado[id] ?? 0;
          usado[id] = antes + min;
          // exceso = lo que pasa del tiempo del día (pausa activa: de la bolsa)
          const tope = id === 'pausa_activa' ? (d.bolsa ?? d.min * 3) : d.min;
          r.pausas.push({
            ...base,
            clase: 'Descanso',
            tipo: d.texto,
            inicio: hm(ini),
            fin: hm(ini + min),
            minutos: min,
            configurado: d.bolsa ? `máx. ${d.min} min (bolsa ${d.bolsa})` : `${d.min} min`,
            exceso: Math.max(0, usado[id] - tope) - Math.max(0, antes - tope),
            cierre: volvioAntes
              ? 'Manual (volvió antes)'
              : durDemo && durDemo < d.min
                ? 'Manual (terminó)'
                : 'Automático',
            autorizo: '—',
          });
        }
        // Actividades autorizadas habilitadas desde la web para ese día (y una capacitación de ejemplo)
        const habilitadas = actividades.filter(
          (a) => a.trabajadorId === t.id && a.fecha === f && a.estado === 'habilitada',
        );
        const ejemplo =
          !sabado && s % 4 === 0
            ? [{ texto: 'Capacitación', modo: 'asignado', minutos: 60, autorizadaPor: 'Laura Gómez (SST)' }]
            : [];
        [...habilitadas, ...ejemplo].forEach((a, k) => {
          const ini = 14 * 60 + k * 90;
          const min = a.modo === 'asignado' ? a.minutos : 35 + (s % 45);
          if (esHoy && ini + min > ahoraMin) return;
          r.pausas.push({
            ...base,
            clase: 'Actividad autorizada',
            tipo: a.texto,
            inicio: hm(ini),
            fin: hm(ini + min),
            minutos: min,
            configurado: a.modo === 'asignado' ? `${a.minutos} min` : 'Libre',
            exceso: 0,
            cierre: a.modo === 'asignado' ? 'Automático' : 'Manual',
            autorizo: a.autorizadaPor,
          });
        });
      }

      // Incidentes
      if (!noApto && s % 100 >= 6 && s % 100 < 9) {
        const ini = 10 * 60 + (s % 300);
        r.incidentes.push({
          ...base,
          hora: hm(ini),
          descripcion: ['Caída leve al bajar de la moto', 'Golpe con material en obra', 'Pinchazo de llanta en vía'][
            s % 3
          ],
          fotos: s % 3,
          puedeContinuar: s % 2 === 0,
          ubicacion: `${(t.lat + (s % 7) * 0.001).toFixed(5)}, ${(t.lng - (s % 5) * 0.001).toFixed(5)}`,
          minutos: ini,
        });
      }

      // Notificaciones enviadas al celular y si el trabajador las marcó como leídas (y a qué hora)
      const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();
      const avisos = [
        [
          'Reportes',
          'Te quedan 10 minutos',
          'Envía tu reporte de 9:00 – 10:00 antes de que cierre la hora.',
          9 * 60 + 50,
        ],
        ...(s % 5 === 0 ? [['Reportes', 'No reportaste', 'No enviaste el reporte de 11:00 – 12:00.', 12 * 60]] : []),
        ...(s % 6 === 1
          ? [
              [
                'Exceso de velocidad',
                'Exceso de velocidad',
                'Ibas a 74 km/h y el límite es 60 km/h.',
                10 * 60 + (s % 50),
              ],
            ]
          : []),
        ...(s % 4 === 2
          ? [['Visitas', 'Nueva visita asignada', 'Ferretería El Tornillo · llegada 14:30', 8 * 60 + (s % 40)]]
          : []),
        ...(s % 9 === 3
          ? [['Visitas', 'Visita cancelada', 'Bodega Norte ya no está programada para hoy.', 11 * 60 + (s % 30)]]
          : []),
        ...(s % 17 === 0 ? [['Documentos', 'Documento próximo a vencer', 'Tu SOAT vence en 15 días.', 8 * 60]] : []),
        ...(s % 13 === 5
          ? [['Salida del área', 'Saliste del área asignada', 'Saliste de Obra Torre 3 a las 15:12.', 15 * 60 + 12]]
          : []),
      ];
      for (const [tipo, titulo, mensaje, min] of avisos) {
        if (esHoy && min > ahoraMin) continue;
        const sinLeer = (s + min) % 10 === 0 || (esHoy && (s + min) % 3 === 0);
        const tarda = 2 + ((s + min) % 50);
        const leida = !sinLeer && (!esHoy || min + tarda <= ahoraMin);
        r.notificaciones.push({
          ...base,
          enviada: hm(min),
          minutos: min,
          tipo,
          titulo,
          mensaje,
          leida,
          leidaA: leida ? hm(min + tarda) : null,
          minutosParaLeer: leida ? tarda : null,
        });
      }

      // GPS apagado manualmente tras una novedad (demo)
      const inc = r.incidentes.find((i) => i.trabajadorId === t.id && aTextoFecha(i.fecha) === f && !i.puedeContinuar);
      if (noApto || inc)
        r.apagados.push({
          ...base,
          hora: hm(noApto ? horaSalud + 25 : inc.minutos + 30),
          minutos: noApto ? horaSalud + 25 : inc.minutos + 30,
          por: ['Laura Gómez (SST)', 'Jorge Pérez (Supervisor)'][s % 2],
          motivo: noApto
            ? 'Se verificó por teléfono: no está en condiciones de trabajar. Se remite a la EPS.'
            : 'Incidente atendido: no puede continuar la jornada.',
          origen: noApto ? 'Salud' : 'Incidente',
        });
    }
  }
  // Apagados hechos desde esta web (se suman a los de ejemplo)
  for (const a of apagadosManuales) {
    const fecha = new Date(a.hora);
    if (fecha < desde || fecha > new Date(hasta.getTime() + 86399999)) continue;
    const t = trabajadores.find((x) => x.id === a.trabajadorId);
    if (!t) continue;
    const min = fecha.getHours() * 60 + fecha.getMinutes();
    r.apagados.unshift({
      fecha: new Date(fecha.toDateString()),
      trabajadorId: t.id,
      persona: `${t.nombres} ${t.apellidos}`,
      hora: hm(min),
      minutos: min,
      por: a.por,
      motivo: a.motivo,
      origen: 'Manual',
    });
  }
  const orden = (a, b) => b.fecha - a.fecha || a.persona.localeCompare(b.persona);
  Object.values(r).forEach((l) => l.sort(orden));
  return r;
}

// Ausentismo: novedades que sacan al trabajador de la jornada (no apto, incidente que no le deja continuar,
// GPS apagado manualmente) con las horas perdidas hasta el fin del horario
export function ausentismo(n) {
  const eventos = [
    ...n.salud.filter((x) => x.apto === 'No').map((x) => ({ ...x, tipo: 'Salud: no apto', detalle: x.observaciones })),
    ...n.incidentes
      .filter((x) => !x.puedeContinuar)
      .map((x) => ({ ...x, tipo: 'Incidente: no continúa', detalle: x.descripcion })),
    ...n.apagados.map((x) => ({
      ...x,
      tipo: 'GPS apagado manualmente',
      detalle: `${x.por}: ${x.motivo}`,
      horasPerdidas: Math.max(0, Math.round(((FIN_JORNADA - x.minutos) / 60) * 10) / 10),
    })),
  ].sort((a, b) => b.fecha - a.fecha);
  const porTrabajador = new Map();
  eventos.forEach((e) => {
    const r = porTrabajador.get(e.trabajadorId) ?? { persona: e.persona, eventos: 0, dias: new Set(), horas: 0 };
    r.eventos += 1;
    r.dias.add(aTextoFecha(e.fecha));
    r.horas += e.horasPerdidas ?? 0;
    porTrabajador.set(e.trabajadorId, r);
  });
  return {
    eventos,
    resumen: [...porTrabajador.values()]
      .map((r) => ({ ...r, dias: r.dias.size, horas: Math.round(r.horas * 10) / 10 }))
      .sort((a, b) => b.horas - a.horas),
  };
}

// Resumen de pausas y actividades por trabajador (tiempo total de descanso, quién excede el almuerzo…)
export function resumenPausas(n) {
  const porPersona = new Map();
  for (const p of n.pausas) {
    const r = porPersona.get(p.persona) ?? {
      persona: p.persona,
      descansoMin: 0,
      almuerzoMin: 0,
      diasAlmuerzo: new Set(),
      excesoAlmuerzo: 0,
      diasExceso: new Set(),
      pausasActivas: 0,
      pausaActivaMin: 0,
      diasPausaActiva: new Set(),
      actividadesMin: 0,
    };
    if (p.clase === 'Descanso') {
      r.descansoMin += p.minutos;
      if (p.tipo === 'Almuerzo') {
        r.almuerzoMin += p.minutos;
        r.diasAlmuerzo.add(p.fecha.toDateString());
        if (p.exceso > 0) {
          r.excesoAlmuerzo += p.exceso;
          r.diasExceso.add(p.fecha.toDateString());
        }
      }
      if (p.tipo === 'Pausa activa') {
        r.pausasActivas += 1;
        r.pausaActivaMin += p.minutos;
        r.diasPausaActiva.add(p.fecha.toDateString());
      }
    } else r.actividadesMin += p.minutos;
    porPersona.set(p.persona, r);
  }
  return [...porPersona.values()]
    .map((r) => ({
      persona: r.persona,
      descansoH: Math.round((r.descansoMin / 60) * 10) / 10,
      almuerzoPromedio: r.diasAlmuerzo.size ? Math.round(r.almuerzoMin / r.diasAlmuerzo.size) : 0,
      diasExceso: r.diasExceso.size,
      excesoAlmuerzo: r.excesoAlmuerzo,
      pausasActivas: r.pausasActivas,
      pausaActivaDia: r.diasPausaActiva.size ? Math.round(r.pausaActivaMin / r.diasPausaActiva.size) : 0,
      actividadesH: Math.round((r.actividadesMin / 60) * 10) / 10,
    }))
    .sort((a, b) => b.excesoAlmuerzo - a.excesoAlmuerzo || a.persona.localeCompare(b.persona));
}

// Resumen de ingresos por trabajador: primer ingreso promedio, llegadas tarde, PIN incorrectos y batería
export function resumenIngresos(n) {
  const m = new Map();
  for (const x of n.ingresos) {
    const r = m.get(x.persona) ?? {
      persona: x.persona,
      dias: 0,
      sumaPrimero: 0,
      tardes: 0,
      minutosTarde: 0,
      pin: 0,
      sumaBat: 0,
      bajas: 0,
    };
    if (x.primero) {
      r.dias += 1;
      r.sumaPrimero += x.minutos;
      r.sumaBat += x.bateria ?? 0;
      if (x.minutosTarde) {
        r.tardes += 1;
        r.minutosTarde += x.minutosTarde;
      }
    }
    if (x.evento === 'PIN incorrecto') r.pin += 1;
    if (x.evento === 'Batería baja') r.bajas += 1;
    m.set(x.persona, r);
  }
  return [...m.values()]
    .map((r) => ({
      persona: r.persona,
      dias: r.dias,
      primeroPromedio: r.dias ? hm(Math.round(r.sumaPrimero / r.dias)) : '—',
      tardes: r.tardes,
      minutosTarde: r.minutosTarde,
      pin: r.pin,
      bateriaPromedio: r.dias ? Math.round(r.sumaBat / r.dias) : null,
      bajas: r.bajas,
    }))
    .sort((a, b) => b.tardes - a.tardes || a.persona.localeCompare(b.persona));
}
