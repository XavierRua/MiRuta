import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { guardarJson, leerJson } from '../services/archivos';
import { ahoraServidor } from '../services/horaServidor';
import {
  cancelarAlarmaPausa,
  cancelarRecordatoriosReportes,
  notificarAhora,
  programarAlarmaPausa,
  programarPausasActivas,
} from '../services/notificaciones';
import { duracionMin, textoDuracion } from '../config/formularios';
import { leerBateria } from '../services/bateria';
import { enColombia } from '../utils/horaColombia';
import { usePermisos } from './PermisosContext';

const JornadaDiaContext = createContext(null);
const ARCHIVO = 'jornada-dia.json';
const ARCHIVO_VEHICULO = 'vehiculo-config.json';
const vacio = (fecha) => ({
  fecha,
  saludInicio: null, // { respuestas, noApto, alerta, hora }
  saludFin: null,
  preoperacional: null, // { vehiculo: { uso, placa, clase }, items, fallas, picoPlaca, hora }
  // Pausas de descanso y actividades autorizadas (registro aparte de los reportes):
  // [{ id, clase: 'descanso' | 'actividad', tipo, texto, icono, modo: 'asignado' | 'libre', inicio, finPrevisto,
  //    fin, minutos, cerradaPor, actividadId, autorizadaPor }]
  pausas: [],
  actividadesAvisadas: [], // actividades autorizadas que ya se le notificaron
  incidentes: [], // [{ id, descripcion, fotos, puedeContinuar, hora, ubicacion }]
  gpsApagado: null, // { por, rol, hora, motivo }
  inicioJornada: null, // { hora, bateria }: batería con la que empezó la jornada
});

// Registros del día del trabajador: salud (inicio y fin), preoperacional, pausas, incidentes y
// si el supervisor / SST / administrador apagó su GPS. Se guardan en el celular y se envían al servidor.
export function JornadaDiaProvider({ children }) {
  const hoyTexto = ahoraServidor().toDateString();
  const [dia, setDia] = useState(vacio(hoyTexto));
  const [cargado, setCargado] = useState(false);
  const [picoPlacaPropio, setPicoPlacaPropio] = useState([]); // días de la semana (0 = domingo)
  const diaRef = useRef(dia);
  const { reglas, tiposPausa } = api.getFormularios();
  // Actividades autorizadas para hoy (la web las habilita por trabajador y fecha)
  const [actividades, setActividades] = useState(() => api.getActividadesAutorizadas(ahoraServidor()));

  useEffect(() => {
    Promise.all([leerJson(ARCHIVO), leerJson(ARCHIVO_VEHICULO)])
      .then(([g, v]) => {
        if (g?.fecha === hoyTexto) {
          diaRef.current = g;
          setDia(g);
        }
        setPicoPlacaPropio(v?.picoPlaca ?? []);
      })
      .finally(() => setCargado(true));
  }, [hoyTexto]);

  const actualizar = (cambio) => {
    const nuevo = { ...diaRef.current, ...cambio };
    diaRef.current = nuevo;
    setDia(nuevo);
    try {
      guardarJson(ARCHIVO, nuevo);
    } catch {
      // se reintenta en el próximo cambio
    }
    return nuevo;
  };

  // ---------- Inicio obligatorio ----------
  const horarioHoy = api.getHorarioDia(ahoraServidor());
  // Cada formulario es un permiso: si el rol no lo tiene, no se le pide
  const { puede } = usePermisos();
  const requiereSalud = puede('salud.reportar');
  const requierePreop = puede('preoperacional.diligenciar');
  const inicioRequerido = !!horarioHoy && (requiereSalud || requierePreop); // los días sin horario no se pide
  const inicioCompleto =
    !inicioRequerido || ((!requiereSalud || !!dia.saludInicio) && (!requierePreop || !!dia.preoperacional));

  const guardarSalud = async (momento, respuestas, preguntas) => {
    const alertas = preguntas.filter((p) => p.alertaSi && respuestas[p.id] === p.alertaSi).map((p) => p.texto);
    const registro = {
      bateria: await leerBateria(),
      respuestas,
      noApto: respuestas.apto === 'No',
      alerta: alertas.length > 0,
      motivos: alertas,
      hora: ahoraServidor().toISOString(),
    };
    await api.enviarFormulario(`salud_${momento}`, registro);
    actualizar(momento === 'inicio' ? { saludInicio: registro } : { saludFin: registro });
    return registro;
  };

  const guardarPreoperacional = async (registro) => {
    const r = { ...registro, hora: ahoraServidor().toISOString(), bateria: await leerBateria() };
    await api.enviarFormulario('preoperacional', r);
    actualizar({ preoperacional: r });
    return r;
  };

  const guardarPicoPlaca = (dias) => {
    setPicoPlacaPropio(dias);
    try {
      guardarJson(ARCHIVO_VEHICULO, { picoPlaca: dias });
    } catch {
      // nada
    }
  };

  // ---------- Pausas ----------
  const pausaActiva = dia.pausas.find((p) => !p.fin) ?? null;

  // Cuánto ha usado hoy de cada descanso (con la hora del servidor):
  // { veces, minutosUsados, restanteMin (bolsa de la pausa activa), agotado }
  const usoDescanso = (tipo, ahora = ahoraServidor()) => {
    const hechas = diaRef.current.pausas.filter((p) => p.clase !== 'actividad' && p.tipo === tipo.id);
    const minutosUsados = hechas.reduce((t, p) => {
      const fin = p.fin ? new Date(p.fin) : new Date(Math.min(ahora, new Date(p.finPrevisto)));
      return t + Math.max(0, (fin - new Date(p.inicio)) / 60000);
    }, 0);
    if (tipo.bolsaMin != null) {
      const restanteMin = Math.max(0, Math.floor(tipo.bolsaMin - minutosUsados));
      return { veces: hechas.length, minutosUsados, restanteMin, agotado: restanteMin < 1 };
    }
    return {
      veces: hechas.length,
      minutosUsados,
      restanteMin: null,
      agotado: tipo.veces != null && hechas.length >= tipo.veces,
    };
  };

  // Pausa de descanso (desayuno, almuerzo, pausa activa): se cierra sola al cumplir el tiempo, con alarma.
  // Desayuno y almuerzo: las veces por jornada configuradas (1). Pausa activa: hasta agotar la bolsa del día.
  const iniciarPausa = async (tipo) => {
    if (diaRef.current.pausas.some((p) => !p.fin)) return null; // una a la vez
    const uso = usoDescanso(tipo);
    if (uso.agotado) {
      throw new Error(
        tipo.bolsaMin != null
          ? `Ya usaste los ${tipo.bolsaMin} min de pausa activa de hoy.`
          : `Ya tomaste tu ${tipo.texto.toLowerCase()} de hoy.`,
      );
    }
    const inicio = ahoraServidor();
    // Pausa activa: dura lo que le quede en la bolsa, sin pasar del máximo por pausa
    const minutos = tipo.bolsaMin != null ? Math.min(duracionMin(tipo), uso.restanteMin) : duracionMin(tipo);
    const pausa = {
      id: `pausa-${inicio.getTime()}`,
      clase: 'descanso',
      tipo: tipo.id,
      texto: tipo.texto,
      icono: tipo.icono,
      modo: 'asignado',
      inicio: inicio.toISOString(),
      finPrevisto: new Date(inicio.getTime() + minutos * 60000).toISOString(),
      fin: null,
      minutos,
    };
    actualizar({ pausas: [...diaRef.current.pausas, pausa] });
    await programarAlarmaPausa(pausa).catch(() => {});
    api.enviarFormulario('pausa_inicio', pausa).catch(() => {});
    return pausa;
  };

  // Actividad autorizada (capacitación, reunión, cita médica…): solo si la habilitaron para hoy.
  // Tiempo asignado: alarma y cierre automático. Tiempo libre: cronómetro, la termina el trabajador.
  const iniciarActividad = async (aut) => {
    if (diaRef.current.pausas.some((p) => !p.fin)) return null;
    if (diaRef.current.pausas.some((p) => p.actividadId === aut.id)) {
      throw new Error('Esta actividad ya la usaste hoy.');
    }
    const inicio = ahoraServidor();
    const asignado = aut.modo === 'asignado';
    const pausa = {
      id: `act-${inicio.getTime()}`,
      clase: 'actividad',
      tipo: aut.tipo,
      texto: aut.texto,
      icono: aut.icono,
      modo: aut.modo,
      inicio: inicio.toISOString(),
      finPrevisto: asignado ? new Date(inicio.getTime() + aut.minutos * 60000).toISOString() : null,
      fin: null,
      minutos: asignado ? aut.minutos : null,
      actividadId: aut.id,
      autorizadaPor: aut.autorizadaPor,
    };
    actualizar({ pausas: [...diaRef.current.pausas, pausa] });
    if (asignado) await programarAlarmaPausa(pausa).catch(() => {});
    api.enviarFormulario('actividad_inicio', pausa).catch(() => {});
    return pausa;
  };

  const cerrarPausa = useCallback(async (manual = false) => {
    const activa = diaRef.current.pausas.find((p) => !p.fin);
    if (!activa) return;
    const ahora = ahoraServidor();
    const fin = manual || !activa.finPrevisto ? ahora : new Date(Math.min(ahora, new Date(activa.finPrevisto)));
    const cerrada = { ...activa, fin: fin.toISOString(), cerradaPor: manual ? 'trabajador' : 'automatico' };
    actualizar({ pausas: diaRef.current.pausas.map((p) => (p.id === activa.id ? cerrada : p)) });
    if (manual) await cancelarAlarmaPausa().catch(() => {});
    api.enviarFormulario(activa.clase === 'actividad' ? 'actividad_fin' : 'pausa_fin', cerrada).catch(() => {});
  }, []);

  // La pausa se cierra sola al cumplirse el tiempo (la alarma ya quedó programada al iniciarla).
  // Las actividades con tiempo libre no tienen fin previsto: las termina el trabajador.
  useEffect(() => {
    if (!pausaActiva?.finPrevisto) return;
    const revisar = () => {
      if (ahoraServidor() >= new Date(pausaActiva.finPrevisto)) cerrarPausa(false);
    };
    revisar();
    const id = setInterval(revisar, 15000);
    return () => clearInterval(id);
  }, [pausaActiva?.id, cerrarPausa]);

  // Recordatorios de pausa activa durante el horario (cada N minutos, con sonido)
  useEffect(() => {
    if (!cargado || !horarioHoy || dia.gpsApagado) return;
    const ahora = ahoraServidor();
    programarPausasActivas(
      enColombia(ahora, horarioHoy.inicio),
      enColombia(ahora, horarioHoy.fin),
      reglas.pausaActivaCadaMin,
    ).catch(() => {});
  }, [cargado, !!dia.gpsApagado]);

  // ---------- Actividades autorizadas: aviso con sonido cuando le habilitan una ----------
  // Con Supabase llega una notificación push del servidor (trigger de 0016); aquí se revisa al abrir y cada minuto.
  useEffect(() => {
    if (!cargado) return;
    const revisar = () => {
      const lista = api.getActividadesAutorizadas(ahoraServidor());
      setActividades(lista);
      const nuevas = lista.filter((a) => !diaRef.current.actividadesAvisadas?.includes(a.id));
      if (!nuevas.length) return;
      actualizar({ actividadesAvisadas: [...(diaRef.current.actividadesAvisadas ?? []), ...nuevas.map((a) => a.id)] });
      for (const a of nuevas) {
        notificarAhora(
          'Te habilitaron una actividad',
          `${a.texto} · ${a.modo === 'asignado' ? textoDuracion(a.minutos) : 'tiempo libre'} · autorizó ${a.autorizadaPor}. Iníciala en Jornada → Actividades autorizadas.`,
          { tipo: 'actividad', actividad: a.id },
        ).catch(() => {});
      }
    };
    revisar();
    const id = setInterval(revisar, 60000);
    return () => clearInterval(id);
  }, [cargado]);

  // ---------- Batería al iniciar la jornada ----------
  // La primera vez que la app está abierta desde la hora de inicio del horario se guarda la batería.
  // (Con el rastreo en segundo plano se tomará en el momento exacto en que arranca el GPS.)
  useEffect(() => {
    if (!cargado || !horarioHoy) return;
    const revisar = () => {
      const ahora = ahoraServidor();
      if (diaRef.current.inicioJornada || ahora < enColombia(ahora, horarioHoy.inicio)) return;
      leerBateria().then((bateria) => {
        if (diaRef.current.inicioJornada) return;
        const registro = { hora: ahora.toISOString(), bateria };
        actualizar({ inicioJornada: registro });
        api.enviarFormulario('inicio_jornada', registro).catch(() => {});
      });
    };
    revisar();
    const id = setInterval(revisar, 60000);
    return () => clearInterval(id);
  }, [cargado]);

  // ---------- Incidentes ----------
  const reportarIncidente = async (datos) => {
    const inc = { id: `inc-${Date.now()}`, ...datos, hora: ahoraServidor().toISOString(), estado: 'reportado' };
    await api.enviarFormulario('incidente', { ...inc, alerta: true });
    actualizar({ incidentes: [inc, ...diaRef.current.incidentes] });
    return inc;
  };

  // ---------- GPS apagado por un perfil autorizado ----------
  // Con Supabase llega en tiempo real; aquí se consulta al abrir y cada minuto.
  const aplicarApagado = async (apagado) => {
    if (!apagado || diaRef.current.gpsApagado) return;
    actualizar({ gpsApagado: apagado });
    await cancelarRecordatoriosReportes().catch(() => {});
    await cancelarAlarmaPausa().catch(() => {});
    await notificarAhora(
      'Tu jornada fue cerrada',
      `${apagado.por} (${apagado.rol}) apagó tu GPS. Motivo: ${apagado.motivo}`,
      { tipo: 'gps_apagado' },
    ).catch(() => {});
  };
  useEffect(() => {
    const revisar = () =>
      api
        .getEstadoJornada()
        .then(aplicarApagado)
        .catch(() => {});
    revisar();
    const id = setInterval(revisar, 60000);
    return () => clearInterval(id);
  }, []);
  const simularApagadoDemo = () =>
    aplicarApagado({
      por: 'Laura Gómez',
      rol: 'SST',
      hora: ahoraServidor().toISOString(),
      motivo: 'Se verificó la novedad por teléfono: no está en condiciones de continuar hoy.',
    });

  return (
    <JornadaDiaContext.Provider
      value={{
        cargado,
        dia,
        inicioRequerido,
        inicioCompleto,
        requiereSalud,
        requierePreop,
        guardarSalud,
        guardarPreoperacional,
        picoPlacaPropio,
        guardarPicoPlaca,
        tiposPausa,
        actividades,
        usoDescanso,
        pausaActiva,
        iniciarPausa,
        iniciarActividad,
        cerrarPausa,
        reportarIncidente,
        simularApagadoDemo,
        vehiculoDelDia: dia.preoperacional?.vehiculo ?? null,
      }}
    >
      {children}
    </JornadaDiaContext.Provider>
  );
}

export function useJornadaDia() {
  return useContext(JornadaDiaContext);
}
