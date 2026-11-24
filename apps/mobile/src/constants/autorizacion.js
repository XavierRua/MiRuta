import { yo } from '../data/mock';

// Texto de ejemplo de la autorización. El texto definitivo debe revisarlo un abogado laboral.
export const VERSION_AUTORIZACION = '1.1';

export const puntosAutorizacion = [
  'Tu ubicación GPS se registrará únicamente dentro de tu horario laboral. El rastreo se enciende y se apaga solo; fuera del horario no se recoge ningún dato.',
  'Finalidades: seguridad del trabajador, control de rutas y visitas, registro de entradas y salidas en geocercas, cálculo de kilómetros y liquidación del auxilio de rodamiento.',
  'También se registran eventos técnicos del celular durante la jornada: apagado, encendido, GPS desactivado, batería y uso de apps de ubicación simulada.',
  'Pueden ver tu información el administrador y el supervisor de tu grupo en ' +
    yo.empresa +
    '. Tú puedes ver tu propio historial en esta app.',
  'Tu cuenta queda vinculada a este celular: guardamos un identificador de la instalación y el modelo del equipo para evitar que otra persona use tu cuenta. Para ingresar usas un PIN; no usamos tu rostro ni tu huella.',
  'Los puntos detallados se guardan 7 días; los resúmenes de recorrido, según la política de la empresa.',
  'Puedes conocer, actualizar, rectificar y solicitar la supresión de tus datos (Ley 1581 de 2012) escribiendo al área de talento humano.',
];
