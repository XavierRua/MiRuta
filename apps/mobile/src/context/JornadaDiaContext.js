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
import { duracionMin } from '../config/formularios';
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
  pausas: [], // [{ id, tipo, texto, inicio, finPrevisto, fin, minutos }]
  incidentes: [], // [{ id, descripcion, fotos, puedeContinuar, hora, ubicacion }]
  gpsApagado: null, // { por, rol, hora, motivo }
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
    const r = { ...registro, hora: ahoraServidor().toISOString() };
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

  const iniciarPausa = async (tipo, opcion) => {
    if (pausaActiva) return null;
    const inicio = ahoraServidor();
    const minutos = duracionMin(opcion ?? tipo);
    const pausa = {
      id: `pausa-${inicio.getTime()}`,
      tipo: tipo.id,
      opcion: opcion?.id ?? null,
      texto: opcion ? `${tipo.texto}: ${opcion.texto}` : tipo.texto,
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

  const cerrarPausa = useCallback(async (manual = false) => {
    const activa = diaRef.current.pausas.find((p) => !p.fin);
    if (!activa) return;
    const ahora = ahoraServidor();
    const fin = manual ? ahora : new Date(Math.min(ahora, new Date(activa.finPrevisto)));
    const cerrada = { ...activa, fin: fin.toISOString(), cerradaPor: manual ? 'trabajador' : 'automatico' };
    actualizar({ pausas: diaRef.current.pausas.map((p) => (p.id === activa.id ? cerrada : p)) });
    if (manual) await cancelarAlarmaPausa().catch(() => {});
    api.enviarFormulario('pausa_fin', cerrada).catch(() => {});
  }, []);

  // La pausa se cierra sola al cumplirse el tiempo (la alarma ya quedó programada al iniciarla)
  useEffect(() => {
    if (!pausaActiva) return;
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
        pausaActiva,
        iniciarPausa,
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
