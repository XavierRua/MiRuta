import { aTextoFecha, deTextoFecha } from './fechas';

export const TIPOS = {
  ruta: { texto: 'Ruta', clase: 'info', ayuda: 'Varios puntos que debe recorrer en orden' },
  obra: { texto: 'Obra', clase: 'naranja', ayuda: 'Un lugar donde debe permanecer (geocerca circular)' },
  zona: { texto: 'Zona', clase: 'morado', ayuda: 'Un área del mapa donde debe trabajar (geocerca)' },
};

export const ESTADOS_VISITA = {
  pendiente: { texto: 'Pendiente', clase: 'muted' },
  cumplida: { texto: 'Cumplida', clase: 'ok' },
  no_cumplida: { texto: 'No cumplida', clase: 'danger' },
};

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function textoRepeticion(r) {
  const hasta = r.hasta ? ` hasta ${deTextoFecha(r.hasta).toLocaleDateString('es-CO')}` : '';
  if (r.tipo === 'diaria') return `Todos los días${hasta}`;
  if (r.tipo === 'lunes_viernes') return `Lunes a viernes${hasta}`;
  if (r.tipo === 'semanal') return `Cada ${r.dias.map((d) => DIAS[d % 7]).join(', ')}${hasta}`;
  return 'Una sola vez';
}

// ¿La programación tiene visita ese día? (fechaTexto = "AAAA-MM-DD")
export function ocurreEn(p, fechaTexto) {
  if (p.estado === 'cancelada' || fechaTexto < p.fecha) return false;
  const r = p.repeticion;
  if (r.hasta && fechaTexto > r.hasta) return false;
  const dia = deTextoFecha(fechaTexto).getDay();
  if (r.tipo === 'no') return fechaTexto === p.fecha;
  if (r.tipo === 'diaria') return dia !== 0;
  if (r.tipo === 'lunes_viernes') return dia >= 1 && dia <= 5;
  if (r.tipo === 'semanal') return r.dias.includes(dia);
  return false;
}

function semilla(texto) {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) % 100000;
  return h;
}

const fmt = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
const aMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Centro y "radio" aproximado de la geocerca (obra: el radio que configuró el administrador; zona: su área)
export function geocercaDe(p) {
  if (p.tipo === 'zona' && p.area.length) {
    const lats = p.area.map((v) => v[0]);
    const lngs = p.area.map((v) => v[1]);
    const lat = (Math.max(...lats) + Math.min(...lats)) / 2;
    const lng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
    return { lat, lng, radio: ((Math.max(...lats) - Math.min(...lats)) / 2) * 111320 };
  }
  return { lat: p.puntos[0]?.lat ?? 6.2476, lng: p.puntos[0]?.lng ?? -75.573, radio: p.radio || 100 };
}

// Recorrido de ejemplo: llega, se mueve dentro, sale y vuelve a entrar según los periodos
function recorridoEjemplo(p, periodos, s) {
  const g = geocercaDe(p);
  const grado = g.radio / 111320;
  const en = (k, ang) => [g.lat + Math.sin(ang) * grado * k, g.lng + Math.cos(ang) * grado * k];
  const lista = [en(3, s % 6)];
  const salidas = [];
  // Tramos por modo: llega en vehículo, se mueve a pie dentro y sale como indique modoSalida
  const tramos = [];
  const agregar = (modo, puntos) => {
    const ult = tramos[tramos.length - 1];
    const desde = ult ? [ult.puntos[ult.puntos.length - 1]] : [lista[0]];
    if (ult?.modo === modo) ult.puntos.push(...puntos);
    else tramos.push({ modo, puntos: [...desde, ...puntos] });
  };
  periodos.forEach((x, i) => {
    const dentro = [en(0.9, (s + i) % 6), en(0.4, (s + i * 2) % 6), en(0.2, (s + i * 3) % 6)];
    agregar(x.modoEntrada ?? 'vehiculo', [dentro[0]]);
    agregar('a_pie', dentro.slice(1));
    lista.push(...dentro);
    if (x.salida) {
      const fuera = en(1.4, (s + i * 5) % 6);
      const lejos = en(2.2, (s + i * 7) % 6);
      salidas.push(fuera);
      agregar(x.modoSalida ?? 'vehiculo', [fuera, lejos]);
      lista.push(fuera, lejos);
    }
  });
  return { recorrido: lista, salidas, tramos };
}

// Visitas (una por trabajador y día) con su resultado.
// Obra y zona: cada entrada y salida de la geocerca es un periodo; el tiempo dentro es la suma.
// Alerta de salida del área solo cuando es la única visita del trabajador ese día y sale dentro de la jornada.
// En la demo, los días pasados se inventan de forma estable; con el GPS real los registra el servidor (0009).
export function generarVisitas(programaciones, trabajadorIds, desde, hasta, ahora = new Date(), finJornadaHora = 17) {
  const lista = [];
  const hoyTexto = aTextoFecha(ahora);
  const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
  for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
    const f = aTextoFecha(d);
    // Visitas de cada trabajador ese día (una sola visita = tarea de todo el día)
    const cuantas = new Map();
    programaciones
      .filter((p) => ocurreEn(p, f))
      .forEach((p) => p.trabajadores.forEach((tid) => cuantas.set(tid, (cuantas.get(tid) ?? 0) + 1)));
    for (const p of programaciones) {
      if (!ocurreEn(p, f)) continue;
      for (const tid of p.trabajadores) {
        if (!trabajadorIds.includes(tid)) continue;
        const s = semilla(`${p.id}${tid}${f}`);
        const estimada = new Date(d);
        estimada.setHours(...p.hora.split(':').map(Number), 0, 0);
        const esHoy = f === hoyTexto;
        const yaPaso = f < hoyTexto || (esHoy && estimada < ahora);
        const cumple = yaPaso && s % 100 >= 18; // ~82 % de cumplimiento en el ejemplo
        const base = {
          id: `${p.id}-${tid}-${f}`,
          programacionId: p.id,
          programacion: p,
          tipo: p.tipo,
          titulo: p.titulo,
          trabajadorId: tid,
          fecha: new Date(d),
          horaEstimada: p.hora,
          periodos: [],
          alertasSalida: [],
          recorrido: [],
        };

        if (p.tipo === 'ruta') {
          const estado = cumple ? 'cumplida' : f < hoyTexto ? 'no_cumplida' : 'pendiente';
          const llegadaMin = aMin(p.hora) + (s % 35) - 10;
          const dur = 30 + (s % 120);
          lista.push({
            ...base,
            estado,
            llegada: cumple ? fmt(llegadaMin) : null,
            salida: cumple && !(esHoy && llegadaMin + dur > ahoraMin) ? fmt(llegadaMin + dur) : null,
            permanenciaMin: cumple ? (esHoy ? Math.min(dur, ahoraMin - llegadaMin) : dur) : null,
            puntosTotal: p.puntos.length,
            puntosVisitados: cumple ? p.puntos.length : estado === 'no_cumplida' ? s % p.puntos.length : 0,
          });
          continue;
        }

        // Obra / zona: periodos dentro de la geocerca
        let periodos = [];
        if (cumple && cuantas.get(tid) === 1) {
          // Única visita del día: permanece hasta el final de la jornada; a veces sale un rato (genera alerta)
          const entrada = aMin(p.hora) + (s % 20) - 10;
          const fin = finJornadaHora * 60 + (s % 15);
          const sale = entrada + 60 + (s % 150);
          const vuelve = sale + 15 + (s % 40);
          if (s % 3 === 0 && vuelve < fin - 30)
            periodos.push({ entrada, salida: sale }, { entrada: vuelve, salida: fin });
          else periodos.push({ entrada, salida: fin });
        } else if (cumple) {
          let t = aMin(p.hora) + (s % 35) - 10;
          const n = 1 + (s % 3);
          for (let k = 0; k < n; k++) {
            const dentro = 25 + ((s >> k) % 80);
            periodos.push({ entrada: t, salida: t + dentro });
            t += dentro + 8 + ((s >> (k + 2)) % 30);
          }
          if (esHoy) {
            periodos = periodos
              .filter((x) => x.entrada <= ahoraMin)
              .map((x) => (x.salida > ahoraMin ? { ...x, salida: null } : x));
          }
        }
        // Cómo entró y salió (a pie o en vehículo) y cuánto tiempo estuvo dentro de cada forma
        periodos = periodos.map((x, k) => ({
          ...x,
          modoEntrada: k === 0 ? 'vehiculo' : (s >> k) % 2 ? 'a_pie' : 'vehiculo',
          modoSalida: x.salida == null ? null : (s >> (k + 1)) % 3 ? 'vehiculo' : 'a_pie',
        }));
        const { recorrido, salidas, tramos } = recorridoEjemplo(p, periodos, s);
        const totalMin = periodos.length
          ? periodos.reduce((tt, x) => tt + ((x.salida ?? ahoraMin) - x.entrada), 0)
          : null;
        const ultimo = periodos[periodos.length - 1];
        lista.push({
          ...base,
          estado: periodos.length ? 'cumplida' : f < hoyTexto ? 'no_cumplida' : 'pendiente',
          llegada: periodos.length ? fmt(periodos[0].entrada) : null,
          salida: ultimo?.salida ? fmt(ultimo.salida) : null,
          permanenciaMin: totalMin,
          periodos: periodos.map((x) => ({
            entrada: fmt(x.entrada),
            salida: x.salida == null ? null : fmt(x.salida),
            minutos: (x.salida ?? ahoraMin) - x.entrada,
            modoEntrada: x.modoEntrada,
            modoSalida: x.modoSalida,
          })),
          // Minutos dentro de la geocerca: a pie, en vehículo y quieto
          tiempos: totalMin
            ? (() => {
                const pie = Math.round(totalMin * (0.3 + (s % 30) / 100));
                const veh = Math.round(totalMin * (0.04 + (s % 8) / 100));
                return { a_pie: pie, vehiculo: veh, quieto: Math.max(0, totalMin - pie - veh) };
              })()
            : null,
          tramos,
          // posibles alertas (se dejan solo si es su única visita del día, abajo)
          alertasSalida: periodos
            .map((x, k) => ({ x, k }))
            .filter(({ x }) => x.salida != null && x.salida < finJornadaHora * 60) // al terminar la jornada no se alerta
            .map(({ x, k }) => ({ hora: fmt(x.salida), lat: salidas[k][0], lng: salidas[k][1] })),
          recorrido,
          puntosTotal: null,
          puntosVisitados: null,
        });
      }
    }
  }
  // Si tiene más visitas ese día, salir del área es normal (va hacia la siguiente): sin alerta
  const porDia = new Map();
  lista.forEach((v) => {
    const k = `${v.trabajadorId}${aTextoFecha(v.fecha)}`;
    porDia.set(k, (porDia.get(k) ?? 0) + 1);
  });
  lista.forEach((v) => {
    if (porDia.get(`${v.trabajadorId}${aTextoFecha(v.fecha)}`) > 1) v.alertasSalida = [];
  });
  return lista.sort((a, b) => b.fecha - a.fecha || a.horaEstimada.localeCompare(b.horaEstimada));
}

export function textoPermanencia(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  return h ? `${h} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`;
}
