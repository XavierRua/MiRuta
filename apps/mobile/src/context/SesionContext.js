import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { SEGURIDAD } from '../config/seguridad';
import { CLAVES, borrarTodo, guardar, leer } from '../services/almacen';
import { infoDispositivo } from '../services/dispositivo';
import { estaBloqueado, guardarPin, reiniciarIntentos, tienePin, verificarPin } from '../services/pin';
import { api } from '../services/api';
import { borrarDocumentos } from '../services/archivos';
import { documentosVehiculoCompletos } from './DocumentosContext';

const SesionContext = createContext(null);

// Pasos del ingreso (AppNavigator muestra la pantalla de cada paso):
// cargando → activar (primera vez en este celular) → crearPin → pin (cada vez que entra)
// → consentimiento → permisos → documentos (fotos de SOAT, licencia, matrícula y técnico-mecánica) → listo (pestañas)
// bloqueado: 5 PIN incorrectos; se avisa al administrador
export function SesionProvider({ children }) {
  const [paso, setPaso] = useState('cargando');
  const [vinculo, setVinculo] = useState(null);
  const enSegundoPlano = useRef(null);

  // Siguiente paso después de desbloquear con PIN
  const continuar = useCallback(async () => {
    if (!(await leer(CLAVES.consentimiento))) return setPaso('consentimiento');
    if (!(await leer(CLAVES.permisos))) return setPaso('permisos');
    if (!(await leer(CLAVES.documentosOmitidos)) && !(await documentosVehiculoCompletos()))
      return setPaso('documentos');
    setPaso('listo');
  }, []);

  // Al abrir la app: ¿este celular ya está vinculado?
  useEffect(() => {
    (async () => {
      const v = await leer(CLAVES.vinculo);
      setVinculo(v);
      if (!v) return setPaso('activar');
      if (!(await tienePin())) return setPaso('crearPin');
      if (await estaBloqueado()) return setPaso('bloqueado');
      setPaso('pin');
    })().catch(() => setPaso('activar'));
  }, []);

  // Si la app estuvo más de N minutos en segundo plano, pide el PIN otra vez
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'background') enSegundoPlano.current = Date.now();
      if (estado === 'active' && enSegundoPlano.current) {
        const min = (Date.now() - enSegundoPlano.current) / 60000;
        enSegundoPlano.current = null;
        if (min >= SEGURIDAD.bloquearTrasMin) setPaso((p) => (p === 'listo' ? 'pin' : p));
      }
    });
    return () => sub.remove();
  }, []);

  const value = {
    paso,
    vinculo,

    // 1. Primera vez: código de empresa + cédula + código de activación
    activar: async (datos) => {
      const dispositivo = await infoDispositivo();
      const v = await api.activarDispositivo({ ...datos, dispositivo });
      await guardar(CLAVES.vinculo, v);
      setVinculo(v);
      setPaso('crearPin');
    },

    // 2. Crear el PIN de este celular
    crearPin: async (pin) => {
      await guardarPin(pin);
      await continuar();
    },

    // 3. Ingreso diario con PIN. Devuelve { ok, restantes, bloqueado }
    ingresarConPin: async (pin) => {
      const r = await verificarPin(pin);
      if (r.ok) await continuar();
      else if (r.bloqueado) {
        await api.avisarAdministrador('pin_bloqueado', { cedula: vinculo?.trabajador?.nombres }, vinculo?.celular);
        setPaso('bloqueado');
      }
      return r;
    },

    aceptarConsentimiento: async () => {
      await guardar(CLAVES.consentimiento, { version: '1.1', fecha: new Date().toISOString() });
      await continuar();
    },
    completarPermisos: async () => {
      await guardar(CLAVES.permisos, true);
      await continuar();
    },
    // Fotos de los documentos del vehículo tomadas (o "omitir por ahora" en la demo)
    completarDocumentos: async (omitido = false) => {
      if (omitido) await guardar(CLAVES.documentosOmitidos, true);
      setPaso('listo');
    },

    // "Cerrar sesión": vuelve a pedir el PIN (el celular sigue vinculado)
    salir: () => setPaso('pin'),

    // Solo para probar el prototipo
    desbloquearDemo: async () => {
      await reiniciarIntentos();
      setPaso('pin');
    },
    desvincularDemo: async () => {
      await borrarTodo();
      borrarDocumentos();
      setVinculo(null);
      setPaso('activar');
    },
  };

  return <SesionContext.Provider value={value}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  return useContext(SesionContext);
}
