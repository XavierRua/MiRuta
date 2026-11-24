// Guardado cifrado en el celular (Keychain en iPhone, Keystore en Android)
import * as SecureStore from 'expo-secure-store';

export const CLAVES = {
  instalacion: 'miruta.instalacion',
  vinculo: 'miruta.vinculo',
  pin: 'miruta.pin',
  intentos: 'miruta.intentos',
  consentimiento: 'miruta.consentimiento',
  permisos: 'miruta.permisos',
  horasExtra: 'miruta.horasExtra',
  visitas: 'miruta.visitas',
  visitasAsignadas: 'miruta.visitasAsignadas',
};

export async function leer(clave) {
  const texto = await SecureStore.getItemAsync(clave);
  return texto ? JSON.parse(texto) : null;
}

export async function guardar(clave, valor) {
  await SecureStore.setItemAsync(clave, JSON.stringify(valor));
}

export async function borrar(clave) {
  await SecureStore.deleteItemAsync(clave);
}

export async function borrarTodo() {
  await Promise.all(Object.values(CLAVES).map((c) => SecureStore.deleteItemAsync(c)));
}
