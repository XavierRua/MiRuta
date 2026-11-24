// Archivos permanentes en el celular (fotos de documentos y su registro).
// Las fotos que entrega la cámara quedan en una carpeta temporal que el sistema puede borrar;
// por eso se copian a la carpeta de documentos de la app. Requiere: npx expo install expo-file-system
import { Directory, File, Paths } from 'expo-file-system';

function carpeta() {
  const dir = new Directory(Paths.document, 'documentos');
  if (!dir.exists) dir.create();
  return dir;
}

// Copia la foto a la carpeta permanente y devuelve la nueva dirección (uri)
export function guardarFotoPermanente(uri, nombre) {
  try {
    const destino = new File(carpeta(), nombre);
    if (destino.exists) destino.delete();
    new File(uri).copy(destino);
    return destino.uri;
  } catch {
    return uri; // si falla, queda la foto temporal
  }
}

export async function leerJson(nombre) {
  try {
    const f = new File(carpeta(), nombre);
    return f.exists ? JSON.parse(await f.text()) : null;
  } catch {
    return null;
  }
}

export function guardarJson(nombre, valor) {
  const f = new File(carpeta(), nombre);
  if (!f.exists) f.create();
  f.write(JSON.stringify(valor));
}

// Borra todas las fotos y registros de documentos (al eliminar el perfil o desvincular el celular)
export function borrarDocumentos() {
  try {
    const dir = new Directory(Paths.document, 'documentos');
    if (dir.exists) dir.delete();
  } catch {
    // nada que borrar
  }
}
