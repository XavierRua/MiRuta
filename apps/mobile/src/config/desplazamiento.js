// Detección de cómo se desplaza el trabajador: a pie, en vehículo o quieto.
// Combina los pasos del podómetro del celular (sensor de bajo consumo) con la velocidad del GPS.
export const DESPLAZAMIENTO = {
  ventanaPasosSeg: 30, // pasos de los últimos 30 s para calcular la cadencia (pasos por minuto)
  cadenciaCaminando: 40, // 40 pasos/min o más = está caminando
  cadenciaMinima: 15, // menos de 15 pasos/min = no está caminando
  velMaxPie: 9, // km/h: por encima ya no es a pie (trote rápido como máximo)
  velMinVehiculo: 12, // km/h: por encima es vehículo
  velQuieto: 2, // km/h: por debajo, sin pasos, está quieto
  // Si el celular no tiene podómetro (o no dio permiso), solo con la velocidad del GPS:
  velMinPieSinPasos: 2.5,
  velMaxPieSinPasos: 7.5,
  // Cuánto tiene que durar un cambio antes de aceptarlo (evita cambios falsos):
  confirmarSeg: {
    a_pie: 40, // caminando de forma sostenida
    vehiculo: 20, // velocidad de vehículo sostenida
    quieto: 60, // un minuto sin moverse
    quietoDesdeVehiculo: 180, // un semáforo o un trancón NO es "a pie" ni "quieto": 3 min detenido sin pasos
  },
  puntoCadaMetros: 10, // guarda un punto del recorrido cada 10 m (para el mapa)
};
