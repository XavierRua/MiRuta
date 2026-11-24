// Rastreo GPS en segundo plano (pendiente – Etapa 1 del MVP).
//
// Aquí irá:
// - programarHorario(horario): alarmas exactas para encender y apagar el rastreo a la hora de entrada y salida.
// - iniciarRastreo() / detenerRastreo(): servicio de ubicación con notificación fija (expo-location + expo-task-manager).
// - guardarPuntoSinSeñal(punto) / enviarPendientes(): cola local cuando no hay datos.
// - registrarEventoDispositivo(tipo): apagado, encendido, GPS desactivado, ubicación simulada.
//
// Nota: esto no funciona en Expo Go; necesitará un "development build".

export async function iniciarRastreo() {
  console.log('[demo] iniciarRastreo: aún no implementado');
}

export async function detenerRastreo() {
  console.log('[demo] detenerRastreo: aún no implementado');
}
