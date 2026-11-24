import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DOCS_ADICIONALES, DOCS_VEHICULO, DOCUMENTOS } from '../config/documentos';
import { api } from '../services/api';
import { borrarDocumentos, guardarFotoPermanente, guardarJson, leerJson } from '../services/archivos';
import { notificarAhora, prepararNotificaciones, programarAvisosDocumentos } from '../services/notificaciones';
import { estadoDocumento } from '../utils/documentos';

const DocumentosContext = createContext(null);
const ARCHIVO = 'registro.json';

// Documentos del trabajador.
// Vehículo: { soat: { foto: { uri, pesoKB }, vence, subidoEn, version, historial: [versiones anteriores] }, … }
// Adicionales: los entrega el servidor (los sube SST); el trabajador no los puede cambiar.
export function DocumentosProvider({ children }) {
  const [vehiculo, setVehiculo] = useState({});
  const [cargado, setCargado] = useState(false);
  const adicionales = api.getDocumentosAdicionales();

  const recargar = () =>
    leerJson(ARCHIVO)
      .then((g) => setVehiculo(g ?? {}))
      .finally(() => setCargado(true));
  useEffect(() => {
    recargar();
  }, []);

  // ¿Ya tomó la foto de los 4 documentos del vehículo? (paso obligatorio del registro)
  const completo = DOCS_VEHICULO.every((d) => vehiculo[d.id]?.foto && (!d.vence || vehiculo[d.id]?.vence));

  // Todos los documentos con su estado (para la pantalla y los avisos)
  const todos = useMemo(
    () => [
      ...DOCS_VEHICULO.map((d) => ({
        ...d,
        grupo: 'vehiculo',
        ...vehiculo[d.id],
        estado: estadoDocumento(vehiculo[d.id]?.vence),
      })),
      ...DOCS_ADICIONALES.map((d) => ({
        ...d,
        grupo: 'adicional',
        ...adicionales[d.id],
        cargado: !!adicionales[d.id],
        estado: adicionales[d.id] ? estadoDocumento(adicionales[d.id].vence) : null,
      })),
    ],
    [vehiculo, adicionales],
  );

  // Avisos de vencimiento en este celular: 15 días antes y el día que vence; y uno inmediato si ya hay vencidos
  useEffect(() => {
    if (!cargado || !completo) return;
    (async () => {
      if (!(await prepararNotificaciones())) return;
      await programarAvisosDocumentos(
        todos.filter((d) => d.vence),
        DOCUMENTOS.diasAviso,
      );
      const vencidos = todos.filter((d) => d.estado?.clave === 'vencido');
      if (vencidos.length)
        await notificarAhora(
          vencidos.length === 1 ? 'Tienes un documento vencido' : `Tienes ${vencidos.length} documentos vencidos`,
          `${vencidos.map((d) => d.nombre).join(', ')}. Revísalo en Mi perfil.`,
          { tipo: 'documento_vencido' },
        );
    })().catch(() => {});
  }, [cargado, completo, todos.map((d) => `${d.id}${d.vence}`).join()]);

  // Guarda o renueva un documento del vehículo: la versión anterior queda en el historial
  const guardarDocumento = async (id, foto, vence) => {
    const actual = vehiculo[id];
    const version = (actual?.version ?? 0) + 1;
    const nuevo = {
      foto: { uri: guardarFotoPermanente(foto.uri, `${id}-v${version}.jpg`), pesoKB: foto.pesoKB },
      vence: vence ?? null,
      subidoEn: new Date().toISOString(),
      version,
      historial: actual
        ? [
            { foto: actual.foto, vence: actual.vence, subidoEn: actual.subidoEn, version: actual.version },
            ...(actual.historial ?? []),
          ].slice(0, DOCUMENTOS.versionesGuardadas)
        : [],
    };
    await api.subirDocumentoVehiculo({ id, ...nuevo });
    const todosNuevos = { ...vehiculo, [id]: nuevo };
    guardarJson(ARCHIVO, todosNuevos);
    setVehiculo(todosNuevos);
  };

  const borrarTodo = () => {
    borrarDocumentos();
    setVehiculo({});
  };

  return (
    <DocumentosContext.Provider value={{ cargado, completo, vehiculo, todos, guardarDocumento, borrarTodo, recargar }}>
      {children}
    </DocumentosContext.Provider>
  );
}

export function useDocumentos() {
  return useContext(DocumentosContext);
}

// Para el ingreso (SesionContext): ¿ya registró los 4 documentos del vehículo?
export async function documentosVehiculoCompletos() {
  const g = (await leerJson(ARCHIVO)) ?? {};
  return DOCS_VEHICULO.every((d) => g[d.id]?.foto && (!d.vence || g[d.id]?.vence));
}
