import { createContext, useContext, useState } from 'react';
import { programacionesEjemplo } from '../data/programacion';

const ProgramacionContext = createContext(null);
const CLAVE = 'miruta.programaciones';

// En la demo se guarda en el navegador. Con Supabase: tablas programaciones, programacion_trabajadores
// y programacion_puntos (0008); al guardar, el servidor avisa al celular de cada trabajador.
function leer() {
  try {
    const guardadas = JSON.parse(localStorage.getItem(CLAVE) ?? 'null');
    return Array.isArray(guardadas) ? guardadas : programacionesEjemplo;
  } catch {
    return programacionesEjemplo;
  }
}

export function ProgramacionProvider({ children }) {
  const [programaciones, setProgramaciones] = useState(leer);

  const guardarTodo = (lista) => {
    setProgramaciones(lista);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(lista));
    } catch {
      // sin almacenamiento: queda mientras la página esté abierta
    }
  };

  const guardar = (p) => {
    const conFecha = { ...p, actualizado: new Date().toISOString() };
    guardarTodo(
      p.id
        ? programaciones.map((x) => (x.id === p.id ? conFecha : x))
        : [{ ...conFecha, id: `p${Date.now()}` }, ...programaciones],
    );
  };
  const cambiarEstado = (id, estado) =>
    guardarTodo(programaciones.map((x) => (x.id === id ? { ...x, estado, actualizado: new Date().toISOString() } : x)));
  const restaurarEjemplo = () => guardarTodo(programacionesEjemplo);

  return (
    <ProgramacionContext.Provider value={{ programaciones, guardar, cambiarEstado, restaurarEjemplo }}>
      {children}
    </ProgramacionContext.Provider>
  );
}

export function useProgramacion() {
  return useContext(ProgramacionContext);
}
