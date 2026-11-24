import { color } from '../theme/colors';
import { DOCUMENTOS } from '../config/documentos';

const DIA = 24 * 60 * 60 * 1000;

// "2027-03-14" → Date local (00:00)
export const deTexto = (t) => {
  const [a, m, d] = t.split('-').map(Number);
  return new Date(a, m - 1, d);
};
export const aTexto = (f) =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
export const fechaLarga = (t) =>
  t ? deTexto(t).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// Estado por fecha de vencimiento: 🟢 vigente · 🟠 próximo a vencer (15 días) · 🔴 vencido
export function estadoDocumento(vence, hoy = new Date()) {
  if (!vence) return { clave: 'sin_vence', texto: 'No vence', color: color.verde, fondo: color.verdeSuave, dias: null };
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dias = Math.round((deTexto(vence) - h) / DIA);
  if (dias < 0) return { clave: 'vencido', texto: 'Vencido', color: color.rojo, fondo: color.rojoSuave, dias };
  if (dias <= DOCUMENTOS.diasAviso)
    return {
      clave: 'proximo',
      texto: dias === 0 ? 'Vence hoy' : `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`,
      color: color.naranja,
      fondo: color.naranjaSuave,
      dias,
    };
  return { clave: 'vigente', texto: 'Vigente', color: color.verde, fondo: color.verdeSuave, dias };
}
