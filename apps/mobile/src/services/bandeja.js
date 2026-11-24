// Bandeja de notificaciones del trabajador (la campana del encabezado).
// Aquí queda TODO lo que le llega: recordatorios y estado de reportes, excesos de velocidad, visitas,
// documentos, salida del área, pausas, cierre de jornada, etc.
//
// - Avisos inmediatos: entran de una vez (agregar).
// - Avisos programados (p. ej. "Te quedan 10 minutos"): el celular los hace sonar a su hora aunque la app esté
//   cerrada; aquí se guardan como "pendientes" y pasan a la bandeja cuando llega su hora (sincronizar).
//   Si se cancelan antes (envió el reporte), se quitan y nunca aparecen.
// - Al marcar una como leída se avisa al servidor (queda la hora en la web: el trabajador no puede decir que no la vio).
import { guardarJson, leerJson } from './archivos';
import { api } from './api';

const ARCHIVO = 'notificaciones.json';
const MAXIMO = 200; // se guardan las 200 más recientes

let estado = { lista: [], pendientes: [] };
let carga = null;
const oyentes = new Set();

function cargar() {
  if (!carga) {
    carga = leerJson(ARCHIVO).then((d) => {
      if (d) estado = { lista: d.lista ?? [], pendientes: d.pendientes ?? [] };
    });
  }
  return carga;
}

function guardarYAvisar() {
  try {
    guardarJson(ARCHIVO, estado);
  } catch {
    // si no se puede guardar, queda en memoria mientras la app esté abierta
  }
  const copia = estado.lista;
  oyentes.forEach((fn) => fn(copia));
}

export function suscribir(fn) {
  oyentes.add(fn);
  cargar().then(() => fn(estado.lista));
  return () => oyentes.delete(fn);
}

const ordenar = (l) => [...l].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, MAXIMO);

// n = { id, tipo, titulo, cuerpo, fecha (ISO), datos }
export async function agregar(n) {
  await cargar();
  if (estado.lista.some((x) => x.id === n.id)) return;
  const nueva = { leida: false, leidaEn: null, ...n, fecha: n.fecha ?? new Date().toISOString() };
  estado = { ...estado, lista: ordenar([nueva, ...estado.lista]) };
  guardarYAvisar();
  api.registrarNotificacion(nueva).catch(() => {}); // queda en la web como "entregada"
}

export async function agregarPendiente(p) {
  await cargar();
  estado = { ...estado, pendientes: [...estado.pendientes.filter((x) => x.id !== p.id), p] };
  guardarYAvisar();
}

// Quita avisos programados que se cancelaron (por ids o por tipo)
export async function quitarPendientes({ ids, tipos }) {
  await cargar();
  estado = {
    ...estado,
    pendientes: estado.pendientes.filter((p) => !(ids?.includes(p.id) || tipos?.includes(p.tipo))),
  };
  guardarYAvisar();
}

// Pasa a la bandeja los avisos programados cuya hora ya llegó
export async function sincronizar(ahora = new Date()) {
  await cargar();
  const llegaron = estado.pendientes.filter((p) => new Date(p.fecha) <= ahora);
  if (!llegaron.length) return;
  estado = { ...estado, pendientes: estado.pendientes.filter((p) => new Date(p.fecha) > ahora) };
  for (const p of llegaron) await agregar(p);
}

export async function marcarLeidas(ids, cuando = new Date()) {
  await cargar();
  const leidaEn = cuando.toISOString();
  const cambiadas = [];
  estado = {
    ...estado,
    lista: estado.lista.map((n) => {
      if (!ids.includes(n.id) || n.leida) return n;
      cambiadas.push(n.id);
      return { ...n, leida: true, leidaEn };
    }),
  };
  if (!cambiadas.length) return;
  guardarYAvisar();
  api.marcarNotificacionesLeidas(cambiadas, leidaEn).catch(() => {});
}

export async function marcarTodasLeidas(cuando) {
  await cargar();
  await marcarLeidas(
    estado.lista.filter((n) => !n.leida).map((n) => n.id),
    cuando,
  );
}

export async function hayNotificaciones() {
  await cargar();
  return estado.lista.length > 0;
}
