import { useEffect, useMemo, useState } from 'react';
import { useReportes } from '../context/ReportesContext';
import { useHorasExtra } from '../context/HorasExtraContext';
import { franjasDeSesion } from '../utils/horasExtra';
import { HORA_SERVIDOR } from '../config/reportes';
import { api } from '../services/api';
import { ahoraServidor, desfaseMinutos, horaVerificada, sincronizarHora } from '../services/horaServidor';
import { cierreDe, estadoFranja, franjasDelDia } from '../utils/reportes';
import { aplicarPausas } from '../utils/pausas';
import { useJornadaDia } from '../context/JornadaDiaContext';

// Franjas de una hora de hoy (jornada normal + horas extras) con su estado, calculado con la HORA DEL SERVIDOR.
// Se recalcula cada 20 segundos y se vuelve a consultar la hora del servidor cada 5 minutos.
// Las pausas y actividades autorizadas extienden la ventana en la que caen (utils/pausas.js).
export function useFranjasHoy() {
  const { reportes } = useReportes();
  const { sesiones } = useHorasExtra();
  const { dia, pausaActiva } = useJornadaDia();
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

  // Horas que la empresa excluyó (capacitaciones): no se pueden enviar ni cuentan para la eficiencia
  const exclusiones = api.getFranjasExcluidas();
  const excluida = (f) =>
    exclusiones.find((x) => f.inicio < new Date(x.hasta) && f.fin > new Date(x.desde) && !f.extra);

  // Pausas del día: cada ventana se extiende por los minutos de pausa que cayeron dentro de ella;
  // si una pausa la cubre completa, queda "En pausa" y no cuenta en la eficiencia
  const pausas = dia.pausas;
  const conPausas = (lista) => aplicarPausas(lista, pausas, ahora, cierreDe);

  const todas = conPausas([...normales, ...extraVisibles]);
  const franjas = todas.filter((f) => !excluida(f) && !f.enPausa); // las que se reportan
  const conEstado = todas.map((f) =>
    excluida(f)
      ? { ...f, estado: 'excluida', motivo: excluida(f).motivo }
      : f.enPausa
        ? { ...f, estado: 'en_pausa' }
        : { ...f, ...estadoFranja(f, reportes, ahora) },
  );
  const franjasRecordatorio = conPausas([...normales, ...extraTodas]).filter((f) => !excluida(f) && !f.enPausa);

  // Cierre de los reportes de hoy: fin del horario + hora de más, corrido si la última ventana se extendió
  const cierresNormales = conPausas(normales).map((f) => (f.enPausa ? f.fin : cierreDe(f)));
  const cierreHoy = cierresNormales.length ? new Date(Math.max(...cierresNormales)) : null;

  return {
    franjas,
    cierreHoy,
    pausas,
    pausaActiva,
    conEstado,
    franjasRecordatorio,
    reportes,
    ahora,
    horaVerificada: verificada,
    desfaseMin: desfaseMinutos(),
  };
}
