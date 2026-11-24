import { createContext, useContext, useState } from 'react';
import { cancelarRecordatorios, notificarEnviado } from '../services/notificaciones';
import { api } from '../services/api';

const ReportesContext = createContext(null);

// Reportes enviados desde este celular.
// En modo demo quedan en memoria; con Supabase se suben al servidor (ver services/api.js).
export function ReportesProvider({ children }) {
  const [reportes, setReportes] = useState([]);

  // Si el servidor rechaza el reporte (por ejemplo, porque ya cerró la hora), lanza un error
  const enviarReporte = async (reporte) => {
    const guardado = await api.enviarReporte(reporte);
    setReportes((lista) => [guardado, ...lista]);
    await cancelarRecordatorios(reporte.franjaId);
    notificarEnviado(reporte.franja).catch(() => {});
    return guardado;
  };

  return <ReportesContext.Provider value={{ reportes, enviarReporte }}>{children}</ReportesContext.Provider>;
}

export function useReportes() {
  return useContext(ReportesContext);
}
