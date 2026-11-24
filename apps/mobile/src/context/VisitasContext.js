import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CLAVES, guardar, leer } from '../services/almacen';
import { ahoraServidor } from '../services/horaServidor';
import { notificarVisita } from '../services/notificaciones';
import { api } from '../services/api';
import { centroDe, dentroDeGeocerca, distanciaM, fueraDeGeocerca, ocurreHoy } from '../utils/visitas';

const VisitasContext = createContext(null);
const VERSION = 2; // registros con entradas y salidas separadas
const MARGEN_SALIDA_RUTA_M = 30;
const MAX_PUNTOS_RECORRIDO = 600;

const registroVacio = (p) =>
  p.tipo === 'ruta'
    ? { programacionId: p.id, puntos: p.puntos.map(() => ({ llegada: null, salida: null })), recorrido: [] }
    : {
        programacionId: p.id,
        periodos: [],
        fuera: null,
        alertasSalida: [],
        recorrido: [],
        tiempos: { a_pie: 0, vehiculo: 0, quieto: 0 }, // segundos dentro de la geocerca por modo
        ultimaLectura: null,
      };

// Visitas programadas de hoy y su registro automático por geocerca (entradas, salidas y tiempo dentro).
// El trabajador no puede editar estos registros: solo los escribe el GPS (y con Supabase, el servidor).
export function VisitasProvider({ children }) {
  const [programaciones, setProgramaciones] = useState(api.getProgramaciones());
  const [registros, setRegistros] = useState({});
  const registrosRef = useRef({});
  const ultimoGuardado = useRef(0);
  const hoyTexto = ahoraServidor().toDateString();
  const tolerancia = api.getIndicadores().toleranciaSalidaMin;

  useEffect(() => {
    leer(CLAVES.visitas)
      .then((g) => {
        if (g?.fecha === hoyTexto && g.version === VERSION) {
          registrosRef.current = g.registros;
          setRegistros(g.registros);
        }
      })
      .catch(() => {});
  }, [hoyTexto]);

  const visitasHoy = useMemo(
    () => programaciones.filter((p) => ocurreHoy(p, ahoraServidor())).sort((a, b) => a.hora.localeCompare(b.hora)),
    [programaciones, hoyTexto],
  );

  // ---- Aviso con sonido si el administrador asignó, cambió o canceló una visita ----
  useEffect(() => {
    (async () => {
      const actual = visitasHoy.map((p) => ({ id: p.id, titulo: p.titulo, hora: p.hora, actualizado: p.actualizado }));
      const antes = await leer(CLAVES.visitasAsignadas);
      await guardar(CLAVES.visitasAsignadas, actual);
      if (!antes) return;
      for (const v of actual) {
        const previa = antes.find((x) => x.id === v.id);
        if (!previa) await notificarVisita('Nueva visita asignada', `${v.titulo} · llegada estimada ${v.hora}`);
        else if (previa.actualizado !== v.actualizado)
          await notificarVisita(
            'Cambió una visita',
            `${v.titulo} · ahora a las ${v.hora}${previa.hora !== v.hora ? ` (antes ${previa.hora})` : ''}`,
          );
      }
      for (const previa of antes)
        if (!actual.some((v) => v.id === previa.id))
          await notificarVisita('Visita cancelada', `${previa.titulo} ya no está programada para hoy.`);
    })().catch(() => {});
  }, [visitasHoy]);

  const persistir = (nuevos) => {
    registrosRef.current = nuevos;
    setRegistros(nuevos);
    guardar(CLAVES.visitas, { fecha: hoyTexto, version: VERSION, registros: nuevos }).catch(() => {});
  };

  // ---- Salidas confirmadas: lleva fuera de la geocerca más que la tolerancia ----
  // La hora de salida es el momento en que salió (no cuando se confirmó).
  const confirmarSalidas = useCallback(
    (base, ahora) => {
      let nuevos = null;
      for (const p of visitasHoy) {
        const r = base[p.id];
        if (p.tipo === 'ruta' || !r?.fuera) continue;
        if (ahora - new Date(r.fuera.desde) < tolerancia * 60000) continue;
        nuevos = nuevos ?? { ...base };
        const periodos = r.periodos.map((x, i) =>
          i === r.periodos.length - 1
            ? {
                ...x,
                salida: r.fuera.desde,
                lugarSalida: { lat: r.fuera.lat, lng: r.fuera.lng },
                modoSalida: r.fuera.modo ?? null, // salió a pie, en vehículo…
              }
            : x,
        );
        let alertasSalida = r.alertasSalida;
        // Alerta solo si es la única visita del día (si tiene más, se entiende que va hacia la siguiente)
        // y si salió dentro de su jornada (al terminarla es normal irse).
        const fin = api.getHorarioDia(ahora)?.fin;
        const salida = new Date(r.fuera.desde);
        if (visitasHoy.length === 1 && (fin == null || salida.getHours() < fin)) {
          const alerta = { hora: r.fuera.desde, lat: r.fuera.lat, lng: r.fuera.lng };
          alertasSalida = [...alertasSalida, alerta];
          notificarVisita(
            'Saliste del área asignada',
            `Saliste de ${p.titulo} a las ${String(salida.getHours()).padStart(2, '0')}:${String(salida.getMinutes()).padStart(2, '0')}. Se avisó al administrador.`,
            'geocerca',
          ).catch(() => {});
          api.alertarSalidaArea({ programacionId: p.id, titulo: p.titulo, ...alerta }).catch(() => {});
        }
        nuevos[p.id] = { ...r, periodos, fuera: null, alertasSalida };
        api.registrarVisita(nuevos[p.id]).catch(() => {});
      }
      return nuevos;
    },
    [visitasHoy, tolerancia],
  );

  // Revisa cada 20 s: así la salida se registra aunque el GPS deje de mandar puntos
  useEffect(() => {
    const id = setInterval(() => {
      const n = confirmarSalidas(registrosRef.current, ahoraServidor());
      if (n) persistir(n);
    }, 20000);
    return () => clearInterval(id);
  }, [confirmarSalidas]);

  // ---- Cada lectura de GPS: ¿entró o salió de alguna geocerca? ----
  const procesarUbicacion = useCallback(
    ({ coords, hora, modo = 'quieto' }) => {
      const pos = { lat: coords.latitude, lng: coords.longitude };
      const t = hora.toISOString();
      let nuevos = { ...registrosRef.current };
      let cambio = false;

      for (const p of visitasHoy) {
        let c = false;
        const r = { ...(nuevos[p.id] ?? registroVacio(p)) };

        if (p.tipo === 'ruta') {
          r.puntos = r.puntos.map((x) => ({ ...x }));
          const i = r.puntos.findIndex((x) => !x.llegada);
          if (i >= 0 && distanciaM(pos, p.puntos[i]) <= p.radio) {
            r.puntos[i].llegada = t;
            c = true;
          }
          const ult = r.puntos.reduce((k, x, idx) => (x.llegada ? idx : k), -1);
          if (ult >= 0 && !r.puntos[ult].salida && distanciaM(pos, p.puntos[ult]) > p.radio + MARGEN_SALIDA_RUTA_M) {
            r.puntos[ult].salida = t;
            c = true;
          }
        } else {
          r.periodos = [...r.periodos];
          const ultimo = r.periodos[r.periodos.length - 1];
          const abierto = !!ultimo && !ultimo.salida;
          // Tiempo dentro de la geocerca según cómo se mueve (a pie, en vehículo o quieto)
          if (abierto && !r.fuera && r.ultimaLectura) {
            const seg = Math.min((hora - new Date(r.ultimaLectura)) / 1000, 120);
            const tiempos = r.tiempos ?? { a_pie: 0, vehiculo: 0, quieto: 0 };
            if (seg > 0) r.tiempos = { ...tiempos, [modo]: (tiempos[modo] ?? 0) + seg };
          }
          r.ultimaLectura = t;
          nuevos[p.id] = r; // los tiempos se actualizan siempre, pero se guardan en el celular cada 30 s
          if (dentroDeGeocerca(p, pos)) {
            if (!abierto) {
              r.periodos.push({ entrada: t, salida: null, modoEntrada: modo }); // nueva entrada (a pie o en vehículo)
              c = true;
            }
            if (r.fuera) {
              r.fuera = null; // volvió antes de la tolerancia: era un salto del GPS o una salida corta
              c = true;
            }
          } else if (abierto && !r.fuera && fueraDeGeocerca(p, pos)) {
            r.fuera = { desde: t, lat: pos.lat, lng: pos.lng, modo }; // posible salida: se confirma tras la tolerancia
            c = true;
          }
        }

        // Recorrido para el mapa: desde la primera entrada, un punto cada 10 m
        const empezo = p.tipo === 'ruta' ? r.puntos.some((x) => x.llegada) : r.periodos.length > 0;
        const ultimoPunto = r.recorrido[r.recorrido.length - 1];
        if (
          empezo &&
          r.recorrido.length < MAX_PUNTOS_RECORRIDO &&
          (!ultimoPunto || distanciaM(ultimoPunto, pos) >= 10)
        ) {
          r.recorrido = [...r.recorrido, { lat: pos.lat, lng: pos.lng, t, m: modo }];
          c = true;
        }

        if (c) {
          cambio = true;
          nuevos[p.id] = r;
          api.registrarVisita(r).catch(() => {});
        }
      }
      const confirmados = confirmarSalidas(nuevos, hora);
      if (confirmados) {
        nuevos = confirmados;
        cambio = true;
      }
      if (cambio || Date.now() - ultimoGuardado.current > 30000) {
        ultimoGuardado.current = Date.now();
        persistir(nuevos);
      } else {
        registrosRef.current = nuevos; // sin escribir en el almacenamiento (ahorra batería)
        setRegistros(nuevos);
      }
    },
    [visitasHoy, confirmarSalidas],
  );

  // ---- Solo modo demo (pruebas sin moverse); no existen en la versión real ----
  const simularLlegada = (p) => {
    const c =
      p.tipo === 'ruta'
        ? (p.puntos[(registrosRef.current[p.id]?.puntos ?? []).filter((x) => x.llegada).length] ?? p.puntos[0])
        : centroDe(p);
    procesarUbicacion({ coords: { latitude: c.lat, longitude: c.lng }, hora: ahoraServidor() });
  };
  const simularSalida = (p) => {
    const c = centroDe(p);
    const lejos = p.tipo === 'zona' ? Math.max(...p.area.map((v) => v[0])) + 0.002 : c.lat + (p.radio + 120) / 111320;
    procesarUbicacion({ coords: { latitude: lejos, longitude: c.lng }, hora: ahoraServidor() });
  };
  const simularCambioAdministrador = () =>
    setProgramaciones((lista) =>
      lista.map((p, i) => {
        if (i !== lista.length - 1) return p;
        const [h, m] = p.hora.split(':').map(Number);
        const t = h * 60 + m + 30;
        return {
          ...p,
          hora: `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`,
          actualizado: new Date().toISOString(),
        };
      }),
    );

  return (
    <VisitasContext.Provider
      value={{
        visitasHoy,
        registros,
        tolerancia,
        procesarUbicacion,
        simularLlegada,
        simularSalida,
        simularCambioAdministrador,
      }}
    >
      {children}
    </VisitasContext.Provider>
  );
}

export function useVisitas() {
  return useContext(VisitasContext);
}
