import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Pedometer } from 'expo-sensors';
import { DESPLAZAMIENTO as D } from '../config/desplazamiento';
import { guardarJson, leerJson } from '../services/archivos';
import { api } from '../services/api';
import { useJornadaDia } from './JornadaDiaContext';
import { nuevoClasificador } from '../utils/desplazamiento';
import { distanciaM } from '../utils/visitas';

const DesplazamientoContext = createContext(null);
const ARCHIVO = 'desplazamiento.json';
const vacio = (fecha) => ({
  fecha,
  totales: { a_pie: { km: 0, seg: 0 }, vehiculo: { km: 0, seg: 0 }, quieto: { km: 0, seg: 0 } },
  tramos: [], // [{ modo, inicio, fin, km }]
  recorrido: [], // [{ lat, lng, t, m }] un punto cada 10 m, con su modo (para colorear la línea)
});

// Detecta si el trabajador va a pie, en vehículo o está quieto y guarda km y tiempo de cada modo del día.
// Batería: el podómetro es un sensor de muy bajo consumo y solo se escucha mientras llegan lecturas de GPS
// (se apaga solo 60 s después de la última). No pide puntos de GPS adicionales.
export function DesplazamientoProvider({ children }) {
  const hoyTexto = new Date().toDateString();
  const [dia, setDia] = useState(vacio(hoyTexto));
  const [modo, setModo] = useState('quieto');
  const diaRef = useRef(dia);
  const clasificador = useRef(nuevoClasificador());
  const anterior = useRef(null); // última lectura { lat, lng, t }
  const pasos = useRef([]); // [{ t, total }] del podómetro
  const conPodometro = useRef(false); // false = se clasifica solo con la velocidad
  const sensor = useRef(null);
  const apagarSensor = useRef(null);
  const guardado = useRef(0);
  // Vehículo del día según el preoperacional (propio o de la empresa); si no lo hay, el asignado en el perfil
  const { vehiculoDelDia } = useJornadaDia();
  const tipoVehiculo = vehiculoDelDia?.clase ?? api.getPerfil().vehiculo?.tipo ?? 'moto';

  useEffect(() => {
    leerJson(ARCHIVO).then((g) => {
      if (g?.fecha === hoyTexto) {
        diaRef.current = g;
        setDia(g);
      }
    });
    return () => sensor.current?.remove();
  }, [hoyTexto]);

  // Enciende el podómetro solo mientras hay GPS (y lo apaga 60 s después de la última lectura)
  const asegurarSensor = () => {
    clearTimeout(apagarSensor.current);
    apagarSensor.current = setTimeout(() => {
      sensor.current?.remove();
      sensor.current = null;
    }, 60000);
    if (sensor.current) return;
    sensor.current = { remove: () => {} }; // evita abrirlo dos veces mientras pide permiso
    (async () => {
      try {
        if (!(await Pedometer.isAvailableAsync())) return;
        const { granted } = await Pedometer.requestPermissionsAsync();
        if (!granted) return;
        conPodometro.current = true;
        sensor.current = Pedometer.watchStepCount(({ steps }) => {
          pasos.current = [...pasos.current, { t: Date.now(), total: steps }].filter(
            (x) => Date.now() - x.t <= D.ventanaPasosSeg * 1000,
          );
        });
      } catch {
        sensor.current = null; // sin podómetro: se clasifica solo con la velocidad
      }
    })();
  };

  // Pasos por minuto en la ventana reciente
  const cadencia = () => {
    if (!conPodometro.current) return null;
    const l = pasos.current;
    if (l.length < 2) return 0;
    const min = (l[l.length - 1].t - l[0].t) / 60000;
    return min > 0 ? (l[l.length - 1].total - l[0].total) / min : 0;
  };

  // Cada lectura del GPS. Devuelve el modo confirmado ('a_pie' | 'vehiculo' | 'quieto').
  const registrarMovimiento = useCallback(({ coords, kmh, hora }) => {
    asegurarSensor();
    const t = hora.getTime();
    const pos = { lat: coords.latitude, lng: coords.longitude };
    const m = clasificador.current.procesar({ kmh: kmh ?? 0, cadencia: cadencia(), t });

    let d = diaRef.current;
    if (d.fecha !== new Date(t).toDateString()) d = vacio(new Date(t).toDateString());
    d = { ...d, totales: { ...d.totales }, tramos: [...d.tramos] };
    const prev = anterior.current;
    if (prev && t > prev.t) {
      const seg = Math.min((t - prev.t) / 1000, 120); // si hubo un hueco largo, no se cuenta entero
      const km = distanciaM(prev, pos) / 1000;
      const kmValido = km / (seg / 3600) < 150 ? km : 0; // descarta saltos del GPS
      d.totales[m] = { km: d.totales[m].km + kmValido, seg: d.totales[m].seg + seg };
      const ultimo = d.tramos[d.tramos.length - 1];
      if (ultimo?.modo === m)
        d.tramos[d.tramos.length - 1] = { ...ultimo, fin: hora.toISOString(), km: ultimo.km + kmValido };
      else d.tramos.push({ modo: m, inicio: new Date(prev.t).toISOString(), fin: hora.toISOString(), km: kmValido });
    }
    const ultimoPunto = d.recorrido[d.recorrido.length - 1];
    if (!ultimoPunto || distanciaM(ultimoPunto, pos) >= D.puntoCadaMetros || ultimoPunto.m !== m)
      d.recorrido = [...d.recorrido, { ...pos, t: hora.toISOString(), m }].slice(-2000);
    anterior.current = { ...pos, t };
    diaRef.current = d;
    setDia(d);
    setModo(m);
    if (t - guardado.current > 30000) {
      guardado.current = t;
      try {
        guardarJson(ARCHIVO, d);
      } catch {
        // sin espacio: se intenta en la próxima lectura
      }
    }
    return m;
  }, []);

  return (
    <DesplazamientoContext.Provider value={{ modo, dia, tipoVehiculo, registrarMovimiento }}>
      {children}
    </DesplazamientoContext.Provider>
  );
}

export function useDesplazamiento() {
  return useContext(DesplazamientoContext);
}
