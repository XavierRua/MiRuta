// Toma fotos con la cámara y las comprime antes de guardarlas/enviarlas.
import * as ImagePicker from 'expo-image-picker';
import * as Manipulador from 'expo-image-manipulator';
import { FOTOS } from '../config/reportes';

async function pesoKB(uri) {
  try {
    const blob = await (await fetch(uri)).blob();
    return Math.round(blob.size / 1024);
  } catch {
    return null;
  }
}

// Reduce la foto para que su lado más largo mida como máximo `ladoMax` px y la guarda en JPEG
async function comprimir(asset, { ladoMax, calidad }) {
  const horizontal = (asset.width ?? 0) >= (asset.height ?? 0);
  const medida = horizontal
    ? { width: Math.min(ladoMax, asset.width || ladoMax) }
    : { height: Math.min(ladoMax, asset.height || ladoMax) };

  let resultado;
  if (Manipulador.ImageManipulator?.manipulate) {
    // API nueva (Expo SDK 52 en adelante)
    const contexto = Manipulador.ImageManipulator.manipulate(asset.uri);
    contexto.resize(medida);
    const imagen = await contexto.renderAsync();
    resultado = await imagen.saveAsync({ compress: calidad, format: Manipulador.SaveFormat.JPEG });
  } else {
    resultado = await Manipulador.manipulateAsync(asset.uri, [{ resize: medida }], {
      compress: calidad,
      format: Manipulador.SaveFormat.JPEG,
    });
  }
  return { uri: resultado.uri, ancho: resultado.width, alto: resultado.height, pesoKB: await pesoKB(resultado.uri) };
}

async function permisoCamara() {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) throw new Error('Necesitamos permiso para usar la cámara.');
}

// Foto de la tarea con la cámara trasera
export async function tomarFotoTarea() {
  await permisoCamara();
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, exif: false });
  if (r.canceled) return null;
  return { ...(await comprimir(r.assets[0], FOTOS.tarea)), origen: 'camara', tomadaEn: new Date() };
}

// Fotos de la tarea desde la galería (solo si config REPORTES.permitirGaleriaTarea = true)
export async function elegirFotosTarea(maximo) {
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: maximo,
    quality: 0.8,
  });
  if (r.canceled) return [];
  return Promise.all(
    r.assets.map(async (a) => ({ ...(await comprimir(a, FOTOS.tarea)), origen: 'galeria', tomadaEn: new Date() })),
  );
}

// Selfie: siempre con la cámara frontal, nunca desde la galería
export async function tomarSelfie() {
  await permisoCamara();
  const r = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    cameraType: ImagePicker.CameraType.front,
    quality: 0.8,
    exif: false,
  });
  if (r.canceled) return null;
  return { ...(await comprimir(r.assets[0], FOTOS.selfie)), origen: 'camara', tomadaEn: new Date() };
}
