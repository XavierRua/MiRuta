// Reglas del ingreso con celular vinculado + PIN
export const SEGURIDAD = {
  largoPin: 4,
  maxIntentos: 5, // al quinto PIN incorrecto se bloquea y se avisa al administrador
  bloquearTrasMin: 5, // si la app pasa más de 5 min en segundo plano, vuelve a pedir el PIN
  largoCodigoActivacion: 6,
};
