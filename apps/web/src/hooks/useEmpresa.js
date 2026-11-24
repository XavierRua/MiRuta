import { useMemo } from 'react';
import { useSesion } from '../context/SesionContext';
import { api } from '../services/api';

// Trabajadores y vehículos de la empresa seleccionada en el menú lateral
export function useEmpresa() {
  const { empresaId } = useSesion();
  const trabajadores = useMemo(() => api.getTrabajadores(empresaId), [empresaId]);
  const vehiculos = useMemo(() => api.getVehiculos(empresaId), [empresaId]);
  return { empresaId, trabajadores, vehiculos };
}
