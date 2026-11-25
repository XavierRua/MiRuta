// Pausas y actividades autorizadas frente a las ventanas de reporte.
//
// Las ventanas siguen fijas en pantalla (8:00–9:00, 9:00–10:00…). Una pausa NO corre el horario: solo extiende
// la ventana en la que cae, exactamente por los minutos de pausa que quedaron dentro de ella.
//   · Desayuno 8:00–8:15 → la ventana 8:00 se puede enviar hasta las 9:15; la de 9:00 sigue igual.
//   · Desayuno 8:50–9:05 → ventana 8:00 +10 min (hasta 9:10) y ventana 9:00 +5 min (hasta 10:05).
//   · Varias pausas en la misma ventana: se suman.
//   · Pausa que cubre toda la ventana (almuerzo 12:00–13:00): "En pausa – Almuerzo"; no cuenta en la eficiencia.
//   · Última ventana: la extensión se suma a su cierre (fin + hora de más) y la jornada cierra cuando vence.
// Todo con la hora del servidor (ahora = ahoraServidor()); las horas se muestran en hora de Colombia.

const MIN = 60 * 1000;

// Tramo de tiempo que ocupa una pausa:
// - terminada: inicio → fin real
// - en curso con tiempo (descanso o actividad con tiempo asignado): inicio → fin previsto
// - en curso con tiempo libre (cronómetro): inicio → ahora (la extensión crece mientras dure)
export function tramoPausa(p, ahora) {
  const inicio = new Date(p.inicio);
  const fin = p.fin ? new Date(p.fin) : p.finPrevisto ? new Date(p.finPrevisto) : ahora;
  return { inicio, fin: fin < inicio ? inicio : fin };
}

const solapeMs = (aIni, aFin, bIni, bFin) => Math.max(0, Math.min(aFin, bFin) - Math.max(aIni, bIni));

// Nombre corto de la pausa para los mensajes: "desayuno", "capacitación"…
export const nombrePausa = (p) => p.texto.toLowerCase();

// Efecto de las pausas del día sobre UNA ventana:
// { extensionMs, extensionMin, motivos: [{ pausa, min }], cubierta: pausa | null }
export function pausasEnVentana(franja, pausas, ahora) {
  const largo = franja.fin - franja.inicio;
  let extensionMs = 0;
  const motivos = [];
  let cubierta = null;
  for (const p of pausas) {
    const t = tramoPausa(p, ahora);
    const ms = solapeMs(franja.inicio, franja.fin, t.inicio, t.fin);
    if (!ms) continue;
    if (ms >= largo) cubierta = p;
    extensionMs += ms;
    motivos.push({ pausa: p, min: Math.round(ms / MIN) });
  }
  if (extensionMs >= largo && !cubierta) cubierta = motivos[0]?.pausa ?? null; // varias que juntas la cubren
  return { extensionMs, extensionMin: Math.round(extensionMs / MIN), motivos, cubierta };
}

// Aplica las pausas a todas las ventanas: cada una queda con su cierre extendido o como "en pausa"
// cierreBase(f) = hasta cuándo se podía enviar sin pausas (la última ventana ya trae la hora de más)
export function aplicarPausas(franjas, pausas, ahora, cierreBase) {
  return franjas.map((f) => {
    const r = pausasEnVentana(f, pausas, ahora);
    if (r.cubierta) return { ...f, enPausa: r.cubierta };
    if (!r.extensionMs) return f;
    return {
      ...f,
      cierre: new Date(cierreBase(f).getTime() + r.extensionMs),
      extensionMin: r.extensionMin,
      motivosExtension: r.motivos,
    };
  });
}

// "Extendido +15 min por desayuno" / "+10 min por desayuno y +5 min por pausa activa"
export function textoExtension(f) {
  if (!f?.extensionMin) return '';
  const partes = f.motivosExtension.map((m) => `+${m.min} min por ${nombrePausa(m.pausa)}`);
  return `Extendido ${partes.join(' y ')}`;
}

// Intervalos de las pausas (para no programar recordatorios de reporte mientras el trabajador está en pausa)
export function tramosDePausas(pausas, ahora) {
  return pausas.map((p) => tramoPausa(p, ahora));
}
