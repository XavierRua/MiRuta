// Identificador de esta instalación de la app y datos del celular.
// El identificador se crea la primera vez y se guarda cifrado; si se desinstala la app,
// cambia, y el administrador debe generar un nuevo código de activación.
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { CLAVES, guardar, leer } from './almacen';

export async function idInstalacion() {
  let id = await leer(CLAVES.instalacion);
  if (!id) {
    id = Crypto.randomUUID();
    await guardar(CLAVES.instalacion, id);
  }
  return id;
}

export async function infoDispositivo() {
  return {
    id: await idInstalacion(),
    modelo: [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || 'Celular',
    sistema: `${Device.osName ?? ''} ${Device.osVersion ?? ''}`.trim(),
  };
}
