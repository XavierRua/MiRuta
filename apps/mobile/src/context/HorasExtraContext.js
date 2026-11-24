import { createContext, useContext, useEffect, useState } from 'react';
import { CLAVES, guardar, leer } from '../services/almacen';
import { ahoraServidor, sincronizarHora } from '../services/horaServidor';
import { iniciarRastreo, detenerRastreo } from '../services/rastreo';
import { api } from '../services/api';
import { kmMedidoHoy } from '../hooks/useVelocidad';
import { mismoDia } from '../utils/fechas';

const HorasExtraContext = createContext(null);

// Sesiones de horas extras de HOY. Se guardan cifradas en el celular para no perder una
// sesión activa si se cierra la app. Inicio y fin usan siempre la hora del servidor.
export function HorasExtraProvider({ children }) {
  const [sesiones, setSesiones] = useState([]);

  useEffect(() => {
    leer(CLAVES.horasExtra)
      .then((guardadas) => {
        const deHoy = (guardadas ?? []).filter((s) => mismoDia(new Date(s.inicio), ahoraServidor()) || !s.fin);
        setSesiones(deHoy);
      })
      .catch(() => {});
  }, []);

  const persistir = async (lista) => {
    setSesiones(lista);
    await guardar(CLAVES.horasExtra, lista);
  };

  // La hora tiene que venir del servidor: sin conexión no se puede iniciar ni finalizar
  const horaOficial = async () => {
    if (!(await sincronizarHora()))
      throw new Error('Sin conexión: no podemos tomar la hora oficial. Conéctate e intenta de nuevo.');
    return ahoraServidor();
  };

  const activa = sesiones.find((s) => !s.fin) ?? null;

  const iniciar = async () => {
    if (activa) return activa;
    const inicio = await horaOficial();
    const sesion = {
      id: `he-${inicio.getTime()}`,
      inicio: inicio.toISOString(),
      fin: null,
      kmInicio: kmMedidoHoy(),
      km: 0,
    };
    await api.iniciarHorasExtra(sesion); // avisa al administrador
    await iniciarRastreo();
    await persistir([...sesiones, sesion]);
    return sesion;
  };

  const finalizar = async () => {
    if (!activa) return null;
    const fin = await horaOficial();
    const cerrada = {
      ...activa,
      fin: fin.toISOString(),
      km: Math.round((kmMedidoHoy() - (activa.kmInicio ?? 0)) * 10) / 10,
    };
    await api.finalizarHorasExtra(cerrada); // avisa al administrador
    await detenerRastreo();
    await persistir(sesiones.map((s) => (s.id === cerrada.id ? cerrada : s)));
    return cerrada;
  };

  return (
    <HorasExtraContext.Provider value={{ sesiones, activa, iniciar, finalizar }}>{children}</HorasExtraContext.Provider>
  );
}

export function useHorasExtra() {
  return useContext(HorasExtraContext);
}
