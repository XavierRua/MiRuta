// PIN del trabajador. Nunca se guarda el PIN: solo su huella SHA-256 con una sal aleatoria.
import * as Crypto from 'expo-crypto';
import { SEGURIDAD } from '../config/seguridad';
import { CLAVES, guardar, leer } from './almacen';

async function huella(sal, pin) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${sal}:${pin}`);
}

// Evita PIN fáciles de adivinar: 1111, 1234, 4321…
export function pinDebil(pin) {
  const d = pin.split('').map(Number);
  const iguales = d.every((x) => x === d[0]);
  const sube = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  const baja = d.every((x, i) => i === 0 || x === d[i - 1] - 1);
  return iguales || sube || baja;
}

export async function guardarPin(pin) {
  const sal = Crypto.randomUUID();
  await guardar(CLAVES.pin, { sal, huella: await huella(sal, pin) });
  await guardar(CLAVES.intentos, 0);
}

export async function tienePin() {
  return !!(await leer(CLAVES.pin));
}

export async function estaBloqueado() {
  return ((await leer(CLAVES.intentos)) ?? 0) >= SEGURIDAD.maxIntentos;
}

// Devuelve { ok, restantes, bloqueado }
export async function verificarPin(pin) {
  const guardado = await leer(CLAVES.pin);
  const intentos = (await leer(CLAVES.intentos)) ?? 0;
  if (!guardado || intentos >= SEGURIDAD.maxIntentos) return { ok: false, restantes: 0, bloqueado: true };

  if ((await huella(guardado.sal, pin)) === guardado.huella) {
    await guardar(CLAVES.intentos, 0);
    return { ok: true };
  }
  const nuevos = intentos + 1;
  await guardar(CLAVES.intentos, nuevos);
  return { ok: false, restantes: SEGURIDAD.maxIntentos - nuevos, bloqueado: nuevos >= SEGURIDAD.maxIntentos };
}

export async function reiniciarIntentos() {
  await guardar(CLAVES.intentos, 0);
}
