import { useEffect, useMemo, useState } from 'react';
import { useReportes } from '../context/ReportesContext';
import { useHorasExtra } from '../context/HorasExtraContext';
import { franjasDeSesion } from '../utils/horasExtra';
import { HORA_SERVIDOR } from '../config/reportes';
import { api } from '../services/api';
import { ahoraServidor, desfaseMinutos, horaVerificada, sincronizarHora } from '../services/horaServidor';
import { estadoFranja, franjasDelDia } from '../utils/reportes';

// Franjas de una hora de hoy (jornada normal + horas extras) con su estado, calculado con la HORA DEL SERVIDOR.
// Se recalcula cada 20 segundos y se vuelve a consultar la hora del servidor cada 5 minutos.
export function useFranjasHoy() {
  const { reportes } = useReportes();
  const { sesiones } = useHorasExtra();
  const [ahora, setAhora] = useState(ahoraServidor());
  const [verificada, setVerificada] = useState(horaVerificada());

  useEffect(() => {
    const sincronizar = async () => {
      await sincronizarHora();
      setVerificada(horaVerificada());
      setAhora(ahoraServidor());
    };
    sincronizar();
    const reloj = setInterval(() => {
      setAhora(ahoraServidor());
      setVerificada(horaVerificada());
    }, 20 * 1000);
    const sync = setInterval(sincronizar, HORA_SERVIDOR.resincronizarMin * 60 * 1000);
    return () => {
      clearInterval(reloj);
      clearInterval(sync);
    };
  }, []);

  const normales = useMemo(() => franjasDelDia(ahora, api.getHorarioDia(ahora)), [ahora.toDateString()]);

  // Horas extras: todas sus franjas (incluidas las futuras, para programar recordatorios)
  const extraTodas = useMemo(
    () => sesiones.flatMap((s) => franjasDeSesion(s, ahora, reportes)),
    [sesiones, reportes, Math.floor(ahora.getTime() / 60000)],
  );
  // En pantalla solo las que ya empezaron
  const extraVisibles = extraTodas.filter((f) => f.inicio <= ahora);

  const franjas = [...normales, ...extraVisibles];
  const conEstado = franjas.map((f) => ({ ...f, ...estadoFranja(f, reportes, ahora) }));
  const franjasRecordatorio = [...normales, ...extraTodas];

  return {
    franjas,
    conEstado,
    franjasRecordatorio,
    reportes,
    ahora,
    horaVerificada: verificada,
    desfaseMin: desfaseMinutos(),
  };
}
