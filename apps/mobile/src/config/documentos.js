// Documentos del trabajador.
// - Vehículo: los toma el trabajador con la cámara al registrarse y los actualiza al renovarlos.
// - Adicionales: los sube y actualiza SOLO la persona de SST desde la web; el trabajador solo los ve.
export const DOCS_VEHICULO = [
  { id: 'soat', nombre: 'SOAT', icono: 'shield-checkmark', vence: true },
  { id: 'licencia', nombre: 'Licencia de conducción', icono: 'card', vence: true },
  { id: 'matricula', nombre: 'Matrícula (tarjeta de propiedad)', icono: 'document-text', vence: false },
  { id: 'tecnomecanica', nombre: 'Revisión técnico-mecánica', icono: 'construct', vence: true },
];

export const DOCS_ADICIONALES = [
  { id: 'arl', nombre: 'ARL', icono: 'medkit' },
  { id: 'planilla', nombre: 'Pago de planilla de seguridad social', icono: 'cash' },
  { id: 'alturas', nombre: 'Certificado de trabajo en alturas', icono: 'trending-up' },
  { id: 'confinados', nombre: 'Certificado de trabajo en espacios confinados', icono: 'cube' },
  // Privado: solo lo ven el propio trabajador, SST y el administrador
  { id: 'examenes', nombre: 'Exámenes médicos ocupacionales', icono: 'pulse', privado: true },
];

export const DOCUMENTOS = {
  diasAviso: 15, // "próximo a vencer" desde 15 días antes
  versionesGuardadas: 5, // versiones anteriores que se conservan en el celular (en el servidor, todas)
};
