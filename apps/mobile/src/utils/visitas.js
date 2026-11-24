import { Platform } from 'react-native';
import { color } from '../theme/colors';

export const TIPOS = {
  ruta: { texto: 'Ruta', icono: 'git-commit', color: color.azul, fondo: color.azulSuave },
  obra: { texto: 'Obra', icono: 'construct', color: color.naranja, fondo: color.naranjaSuave },
  zona: { texto: 'Zona', icono: 'map', color: color.morado, fondo: color.moradoSuave },
};

export const ESTADOS = {
  pendiente: { texto: 'Pendiente', icono: 'ellipse-outline', color: color.suave, fondo: '#eef2f7' },
  en_curso: { texto: 'En curso', icono: 'navigate-circle', color: color.azul, fondo: color.azulSuave },
  cumplida: { texto: 'Cumplida', icono: 'checkmark-circle', color: color.verde, fondo: color.verdeSuave },
  no_cumplida: { texto: 'No cumplida', icono: 'close-circle', color: color.rojo, fondo: color.rojoSuave },
};

// ¿La programación tiene visita ese día? (0 = domingo)
export function ocurreHoy(p, fecha) {
  const d = fecha.getDay();
  const r = p.repeticion;
  if (p.estado === 'cancelada') return false;
  if (r.tipo === 'diaria') return d !== 0;
  if (r.tipo === 'lunes_viernes') return d >= 1 && d <= 5;
  if (r.tipo === 'semanal') return r.dias.includes(d);
  return (
    p.fecha ===
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
  );
}

export function distanciaM(a, b) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ¿El punto está dentro del polígono? (zona)
export function dentroDePoligono(p, area) {
  let dentro = false;
  for (let i = 0, j = area.length - 1; i < area.length; j = i++) {
    const [yi, xi] = area[i];
    const [yj, xj] = area[j];
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

export function centroDe(p) {
  if (p.tipo === 'zona') {
    const n = p.area.length;
    return { lat: p.area.reduce((s, v) => s + v[0], 0) / n, lng: p.area.reduce((s, v) => s + v[1], 0) / n };
  }
  return { lat: p.puntos[0].lat, lng: p.puntos[0].lng };
}

// Abre la ubicación en Google Maps (o la app de mapas del celular); para rutas, con todas las paradas
export function urlMapa(p) {
  if (p.tipo === 'ruta' && p.puntos.length > 1) {
    const destino = p.puntos[p.puntos.length - 1];
    const paradas = p.puntos
      .slice(0, -1)
      .map((x) => `${x.lat},${x.lng}`)
      .join('|');
    return `https://www.google.com/maps/dir/?api=1&destination=${destino.lat},${destino.lng}&waypoints=${encodeURIComponent(paradas)}`;
  }
  const c = centroDe(p);
  return Platform.OS === 'ios'
    ? `http://maps.apple.com/?q=${encodeURIComponent(p.titulo)}&ll=${c.lat},${c.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`;
}

export function minutosEntre(a, b) {
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
}

export function textoPermanencia(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  return h ? `${h} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`;
}

// ---------- Geocerca de la visita (la configura el administrador) ----------
// Obra: círculo con el radio que puso el administrador. Zona: el área que dibujó en el mapa.
export function dentroDeGeocerca(p, pos) {
  return p.tipo === 'zona' ? dentroDePoligono(pos, p.area) : distanciaM(pos, p.puntos[0]) <= p.radio;
}
// Para contar como "afuera" hay que pasar el borde por un pequeño margen (el GPS tiembla unos metros)
export function fueraDeGeocerca(p, pos, margenM = 15) {
  if (p.tipo === 'zona') return !dentroDePoligono(pos, p.area);
  return distanciaM(pos, p.puntos[0]) > p.radio + margenM;
}

// Tiempo total dentro: suma de todos los periodos (el que sigue abierto cuenta hasta ahora)
export function minutosDentro(periodos = [], ahora = new Date()) {
  if (!periodos.length) return null;
  return periodos.reduce((t, x) => t + minutosEntre(x.entrada, x.salida ?? ahora), 0);
}

// Estado de la visita de hoy según lo que registró el GPS.
// Obra/zona: cumplida apenas entra a la geocerca; cada entrada y salida queda como un periodo.
// Ruta: "En curso" desde el primer punto y cumplida al llegar al último. No cumplida: terminó la jornada sin llegar.
export function estadoVisita(p, r, ahora, finJornadaHora) {
  const termino = finJornadaHora == null || ahora.getHours() >= finJornadaHora;
  if (p.tipo === 'ruta') {
    const visitados = (r?.puntos ?? []).filter((x) => x.llegada).length;
    const completa = visitados === p.puntos.length;
    let estado = completa ? 'cumplida' : termino ? 'no_cumplida' : visitados ? 'en_curso' : 'pendiente';
    const llegada = r?.puntos?.find((x) => x.llegada)?.llegada ?? null;
    const salida = completa ? (r?.puntos?.[p.puntos.length - 1]?.salida ?? null) : null;
    return {
      estado,
      llegada,
      salida,
      permanenciaMin: llegada ? minutosEntre(llegada, salida ?? ahora) : null,
      puntosVisitados: visitados,
      puntosTotal: p.puntos.length,
      periodos: [],
      alertasSalida: [],
      dentro: false,
      fuera: null,
    };
  }
  const periodos = r?.periodos ?? [];
  const ultimo = periodos[periodos.length - 1];
  const abierto = !!ultimo && !ultimo.salida;
  return {
    estado: periodos.length ? 'cumplida' : termino ? 'no_cumplida' : 'pendiente',
    llegada: periodos[0]?.entrada ?? null,
    salida: ultimo && !abierto ? ultimo.salida : null,
    permanenciaMin: minutosDentro(periodos, ahora),
    puntosVisitados: null,
    puntosTotal: null,
    periodos,
    alertasSalida: r?.alertasSalida ?? [],
    tiempos: r?.tiempos ?? null, // segundos dentro de la geocerca: { a_pie, vehiculo, quieto }
    dentro: abierto && !r?.fuera,
    fuera: abierto ? (r?.fuera ?? null) : null,
  };
}

export function horaCorta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Visitas de un día anterior (en la demo se inventan siempre iguales para cada fecha).
// Con Supabase: select de visitas, visita_periodos y alertas de ese día (0008 y 0009).
export function visitasDeDiaAnterior(programaciones, fecha, finJornadaHora = 17) {
  const delDia = programaciones.filter((p) => ocurreHoy(p, fecha)).sort((a, b) => a.hora.localeCompare(b.hora));
  return delDia.map((p) => {
    const sem = [...`${fecha.toDateString()}${p.id}`].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 100003, 7);
    const cumple = sem % 100 >= 18;
    const [h, m] = p.hora.split(':').map(Number);
    const base = new Date(fecha);
    base.setHours(h, m + (sem % 25) - 8, 0, 0);
    const iso = (min) => new Date(base.getTime() + min * 60000).toISOString();

    if (p.tipo === 'ruta') {
      const total = p.puntos.length;
      const parcial = !cumple && sem % 2 === 0;
      const permanenciaMin = 40 + (sem % 80);
      return {
        programacion: p,
        estado: cumple ? 'cumplida' : 'no_cumplida',
        llegada: cumple || parcial ? iso(0) : null,
        salida: cumple ? iso(permanenciaMin) : null,
        permanenciaMin: cumple ? permanenciaMin : null,
        puntosVisitados: cumple ? total : parcial ? 1 : 0,
        puntosTotal: total,
        periodos: [],
        alertasSalida: [],
      };
    }
    if (!cumple)
      return {
        programacion: p,
        estado: 'no_cumplida',
        llegada: null,
        salida: null,
        permanenciaMin: null,
        periodos: [],
        alertasSalida: [],
      };

    const periodos = [];
    if (delDia.length === 1) {
      // Única visita del día = tarea de todo el día: se queda hasta el fin de la jornada; a veces sale un rato
      const fin = new Date(fecha);
      fin.setHours(finJornadaHora, sem % 15, 0, 0);
      const finMin = (fin - base) / 60000;
      const sale = 60 + (sem % 150);
      const vuelve = sale + 15 + (sem % 40);
      if (sem % 3 === 0 && vuelve < finMin - 30)
        periodos.push(
          { entrada: iso(0), salida: iso(sale), modoEntrada: 'vehiculo', modoSalida: sem % 2 ? 'a_pie' : 'vehiculo' },
          {
            entrada: iso(vuelve),
            salida: iso(finMin),
            modoEntrada: sem % 2 ? 'a_pie' : 'vehiculo',
            modoSalida: 'vehiculo',
          },
        );
      else periodos.push({ entrada: iso(0), salida: iso(finMin), modoEntrada: 'vehiculo', modoSalida: 'vehiculo' });
    } else {
      // Varias visitas: 1 a 3 periodos en cada una (salió y volvió a entrar)
      let t = 0;
      for (let k = 0; k < 1 + (sem % 3); k++) {
        const dentro = 25 + ((sem >> k) % 70);
        periodos.push({
          entrada: iso(t),
          salida: iso(t + dentro),
          modoEntrada: 'vehiculo',
          modoSalida: (sem >> k) % 3 ? 'vehiculo' : 'a_pie',
        });
        t += dentro + 10 + ((sem >> (k + 1)) % 25);
      }
    }
    const n = periodos.length;
    // Alerta solo si era su única visita del día y salió durante la jornada
    const alertasSalida =
      delDia.length === 1
        ? periodos
            .filter((x, k) => k < n - 1 && new Date(x.salida).getHours() < finJornadaHora)
            .map((x) => ({ hora: x.salida, lat: centroDe(p).lat + 0.002, lng: centroDe(p).lng }))
        : [];
    // Tiempo dentro de la geocerca por modo (ejemplo: casi todo a pie o quieto, poco en vehículo)
    const dentroSeg = minutosDentro(periodos) * 60;
    const pie = Math.round(dentroSeg * (0.25 + (sem % 30) / 100));
    const veh = Math.round(dentroSeg * (0.05 + (sem % 10) / 100));
    const tiempos = { a_pie: pie, vehiculo: veh, quieto: Math.max(0, dentroSeg - pie - veh) };
    return {
      programacion: p,
      estado: 'cumplida',
      tiempos,
      llegada: periodos[0].entrada,
      salida: periodos[n - 1].salida,
      permanenciaMin: minutosDentro(periodos),
      periodos,
      alertasSalida,
    };
  });
}

// ---------- Mapas: ubicación, distancia y cómo llegar ----------
// Color de cada visita en el mapa según su estado
export const COLOR_MAPA = {
  pendiente: { color: color.amarillo, texto: color.texto, nombre: 'Pendiente' },
  en_curso: { color: color.amarillo, texto: color.texto, nombre: 'En curso' },
  cumplida: { color: color.verde, texto: '#fff', nombre: 'Cumplida' },
  no_cumplida: { color: color.rojo, texto: '#fff', nombre: 'No cumplida' },
};

export function formatoDistancia(m) {
  if (m == null) return '—';
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

// A dónde ir: en una ruta, el siguiente punto sin visitar; en obra y zona, el lugar
export function destinoDe(p, r) {
  if (p.tipo === 'ruta') {
    const i = (r?.puntos ?? []).findIndex((x) => !x.llegada);
    const pt = p.puntos[i >= 0 ? i : 0];
    return { lat: pt.lat, lng: pt.lng, nombre: pt.nombre, direccion: pt.direccion };
  }
  const c = centroDe(p);
  return { ...c, nombre: p.puntos[0]?.nombre ?? p.titulo, direccion: p.puntos[0]?.direccion ?? '' };
}

// Distancia hasta el lugar (0 si ya está dentro de la geocerca)
export function distanciaAlLugar(p, pos, r) {
  if (!pos) return null;
  if (p.tipo !== 'ruta' && dentroDeGeocerca(p, pos)) return 0;
  return distanciaM(pos, destinoDe(p, r));
}

// Ruta en Google Maps o Waze (apps gratuitas; si no están instaladas se abre la versión web)
export function urlComoLlegar(destino, app) {
  return app === 'waze'
    ? `https://waze.com/ul?ll=${destino.lat},${destino.lng}&navigate=yes`
    : `https://www.google.com/maps/dir/?api=1&destination=${destino.lat},${destino.lng}&travelmode=driving`;
}
