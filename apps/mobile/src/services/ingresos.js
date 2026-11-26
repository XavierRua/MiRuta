// Registro de ingresos a la app: cada ingreso con PIN, cada PIN incorrecto, el bloqueo y los avisos de batería baja.
// Cada registro guarda la hora oficial (servidor), la batería, si estaba cargando y la ubicación (si se puede).
// Sirve para el control de llegada (llegada tarde) y como respaldo ante reclamos.
// Se guarda en el celular y se envía al servidor (con Supabase: tabla ingresos_app, 0017).
import { guardarJson, leerJson } from './archivos';
import { api } from './api';
import { ahoraServidor } from './horaServidor';
import { leerBateria } from './bateria';
import { obtenerUbicacionRapida } from './ubicacion';
import { enColombia, partesColombia } from '../utils/horaColombia';
import { REGLAS_JORNADA } from '../config/formularios';

const ARCHIVO = 'ingresos.json';
const DIAS_EN_CELULAR = 45; // en el celular se guardan los últimos 45 días (el servidor guarda todo)

let lista = null;
const oyentes = new Set();

async function cargar() {
  if (!lista) lista = (await leerJson(ARCHIVO)) ?? [];
  return lista;
}
function guardar() {
  const limite = Date.now() - DIAS_EN_CELULAR * 86400000;
  lista = lista.filter((x) => new Date(x.hora).getTime() >= limite);
  try {
    guardarJson(ARCHIVO, lista);
  } catch {
    // queda en memoria
  }
  oyentes.forEach((fn) => fn(lista));
}

export function suscribirIngresos(fn) {
  oyentes.add(fn);
  cargar().then(() => fn(lista));
  return () => oyentes.delete(fn);
}

const mismoDiaColombia = (a, b) => {
  const x = partesColombia(a);
  const y = partesColombia(b);
  return x.anio === y.anio && x.mes === y.mes && x.dia === y.dia;
};

// tipo: 'ingreso' | 'pin_incorrecto' | 'bloqueo' | 'bateria_baja'
export async function registrarIngreso(tipo, extra = {}) {
  await cargar();
  const hora = ahoraServidor();
  const [bateria, ubicacion] = await Promise.all([leerBateria(), obtenerUbicacionRapida().catch(() => null)]);
  const registro = { id: `${tipo}-${hora.getTime()}`, tipo, hora: hora.toISOString(), bateria, ubicacion, ...extra };

  // Llegada tarde: solo el PRIMER ingreso del día, comparado con la hora de inicio del horario + tolerancia
  if (tipo === 'ingreso' && !lista.some((x) => x.tipo === 'ingreso' && mismoDiaColombia(new Date(x.hora), hora))) {
    registro.primeroDelDia = true;
    const horario = api.getHorarioDia(hora);
    if (horario) {
      const tolerancia = api.getIndicadores().toleranciaLlegadaMin ?? REGLAS_JORNADA.toleranciaLlegadaMin;
      const minutosTarde = Math.floor((hora - enColombia(hora, horario.inicio)) / 60000);
      if (minutosTarde > tolerancia) registro.minutosTarde = minutosTarde;
    }
  }
  lista = [registro, ...lista];
  guardar();
  api.registrarIngreso(registro).catch(() => {});
  return registro;
}
