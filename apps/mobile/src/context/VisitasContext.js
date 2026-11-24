import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CLAVES, guardar, leer } from '../services/almacen';
import { ahoraServidor } from '../services/horaServidor';
import { notificarVisita } from '../services/notificaciones';
import { api } from '../services/api';
import { centroDe, dentroDePoligono, distanciaM, ocurreHoy } from '../utils/visitas';

const VisitasContext = createContext(null);
const MARGEN_SALIDA_M = 30; // para salir de una obra hay que alejarse 30 m más que el radio (evita "temblores" del GPS)
const LECTURAS_PARA_SALIR = 2; // y estar afuera en 2 lecturas seguidas

const registroVacio = (p) => ({
  programacionId: p.id,
  llegada: null,
  salida: null,
  fuera: 0,
  puntos: p.tipo === 'ruta' ? p.puntos.map(() => ({ llegada: null, salida: null })) : [],
});

// Visitas programadas de hoy y su cumplimiento (llegada, salida y permanencia) según el GPS.
export function VisitasProvider({ children }) {
  const [programaciones, setProgramaciones] = useState(api.getProgramaciones());
  const [registros, setRegistros] = useState({});
  const registrosRef = useRef({});
  const hoyTexto = ahoraServidor().toDateString();

  // Carga lo registrado hoy (se guarda en el celular para no perderlo al cerrar la app)
  useEffect(() => {
    leer(CLAVES.visitas)
      .then((g) => {
        if (g?.fecha === hoyTexto) {
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
      if (!antes) return; // primera vez: no se avisa
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
    guardar(CLAVES.visitas, { fecha: hoyTexto, registros: nuevos }).catch(() => {});
  };

  // ---- Cada lectura de GPS: ¿llegó o salió de algún lugar? ----
  const procesarUbicacion = useCallback(
    ({ coords, hora }) => {
      const pos = { lat: coords.latitude, lng: coords.longitude };
      const t = hora.toISOString();
      let cambio = false;
      const nuevos = { ...registrosRef.current };

      for (const p of visitasHoy) {
        let c = false;
        const r = { ...(nuevos[p.id] ?? registroVacio(p)) };
        if (p.tipo === 'ruta') {
          r.puntos = r.puntos.map((x) => ({ ...x }));
          // Llegada al siguiente punto de la ruta (en orden)
          const i = r.puntos.findIndex((x) => !x.llegada);
          if (i >= 0 && distanciaM(pos, p.puntos[i]) <= p.radio) {
            r.puntos[i].llegada = t;
            r.llegada = r.llegada ?? t;
            c = true;
          }
          // Salida del último punto alcanzado
          const ult = r.puntos.reduce((k, x, idx) => (x.llegada ? idx : k), -1);
          if (ult >= 0 && !r.puntos[ult].salida && distanciaM(pos, p.puntos[ult]) > p.radio + MARGEN_SALIDA_M) {
            r.puntos[ult].salida = t;
            if (ult === r.puntos.length - 1) r.salida = t;
            c = true;
          }
        } else {
          const dentro = p.tipo === 'zona' ? dentroDePoligono(pos, p.area) : distanciaM(pos, p.puntos[0]) <= p.radio;
          const lejos = p.tipo === 'zona' ? !dentro : distanciaM(pos, centroDe(p)) > p.radio + MARGEN_SALIDA_M;
          if (dentro) {
            if (!r.llegada || r.salida || r.fuera) c = true;
            if (!r.llegada) r.llegada = t;
            r.salida = null; // si volvió a entrar, la permanencia sigue contando
            r.fuera = 0;
          } else if (r.llegada && !r.salida && lejos) {
            r.fuera += 1;
            if (r.fuera >= LECTURAS_PARA_SALIR) r.salida = t;
            c = true;
          }
        }
        if (c) {
          cambio = true;
          nuevos[p.id] = r;
          if (r.llegada || r.salida) api.registrarVisita(r).catch(() => {});
        }
      }
      if (cambio) persistir(nuevos);
    },
    [visitasHoy],
  );

  // ---- Solo para probar la demo ----
  const simularLlegada = (p) => {
    const c =
      p.tipo === 'ruta'
        ? (p.puntos[(registrosRef.current[p.id]?.puntos ?? []).filter((x) => x.llegada).length] ?? p.puntos[0])
        : centroDe(p);
    procesarUbicacion({ coords: { latitude: c.lat, longitude: c.lng }, hora: ahoraServidor() });
  };
  const simularSalida = () => {
    for (let k = 0; k < LECTURAS_PARA_SALIR; k++)
      procesarUbicacion({ coords: { latitude: 6.0, longitude: -75.0 }, hora: ahoraServidor() });
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
      value={{ visitasHoy, registros, procesarUbicacion, simularLlegada, simularSalida, simularCambioAdministrador }}
    >
      {children}
    </VisitasContext.Provider>
  );
}

export function useVisitas() {
  return useContext(VisitasContext);
}
