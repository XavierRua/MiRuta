import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { REPORTES } from '../config/reportes';
import { useReportes } from '../context/ReportesContext';
import { elegirFotosTarea, tomarFotoTarea, tomarSelfie } from '../services/fotos';
import { obtenerUbicacion } from '../services/ubicacion';
import { formatoFecha } from '../utils/fechas';
import { cierreDe, dentroDeLaFranja, hhmm, minutosRestantes } from '../utils/reportes';
import { ahoraServidor } from '../services/horaServidor';

// Formulario del reporte de actividad de una franja de una hora
export default function NuevoReporteScreen({ route, navigation }) {
  const p = route.params.franja;
  const franja = {
    ...p,
    inicio: new Date(p.inicio),
    fin: new Date(p.fin),
    cierre: p.cierre ? new Date(p.cierre) : undefined,
  };
  const { enviarReporte } = useReportes();

  const [descripcion, setDescripcion] = useState('');
  const [fotos, setFotos] = useState([]);
  const [selfie, setSelfie] = useState(null);
  const [ubicacion, setUbicacion] = useState(null);
  const [errorUbicacion, setErrorUbicacion] = useState(null);
  const [ahora, setAhora] = useState(ahoraServidor()); // hora oficial (servidor)
  const [ocupado, setOcupado] = useState(null); // texto de lo que está haciendo

  // Reloj en vivo y ubicación automática al abrir
  useEffect(() => {
    const t = setInterval(() => setAhora(ahoraServidor()), 1000);
    actualizarUbicacion();
    return () => clearInterval(t);
  }, []);

  const actualizarUbicacion = async () => {
    try {
      setErrorUbicacion(null);
      setUbicacion(await obtenerUbicacion());
    } catch (e) {
      setErrorUbicacion(e.message);
    }
  };

  const conEspera = async (texto, accion) => {
    try {
      setOcupado(texto);
      await accion();
    } catch (e) {
      Alert.alert('No se pudo completar', e.message);
    } finally {
      setOcupado(null);
    }
  };

  const agregarFotoCamara = () =>
    conEspera('Comprimiendo foto…', async () => {
      const f = await tomarFotoTarea();
      if (f) setFotos((l) => [...l, f]);
    });

  const agregarFotoGaleria = () =>
    conEspera('Comprimiendo fotos…', async () => {
      const nuevas = await elegirFotosTarea(REPORTES.maxFotosTarea - fotos.length);
      setFotos((l) => [...l, ...nuevas].slice(0, REPORTES.maxFotosTarea));
    });

  // La selfie guarda su propia hora y ubicación, tomadas en el mismo momento
  const hacerSelfie = () =>
    conEspera('Registrando selfie y ubicación…', async () => {
      const foto = await tomarSelfie();
      if (!foto) return;
      const lugar = await obtenerUbicacion().catch(() => null);
      if (lugar) setUbicacion(lugar);
      setSelfie({ ...foto, ubicacion: lugar });
    });

  const abierta = dentroDeLaFranja(franja, ahora);
  const restan = minutosRestantes(franja, ahora);

  const faltantes = [
    descripcion.trim().length < REPORTES.minCaracteres && `una descripción (mínimo ${REPORTES.minCaracteres} letras)`,
    fotos.length === 0 && 'al menos una foto de la tarea',
    !selfie && 'tu selfie',
    !ubicacion && 'la ubicación GPS',
  ].filter(Boolean);

  const pesoTotal = [...fotos, selfie].filter(Boolean).reduce((s, f) => s + (f.pesoKB ?? 0), 0);

  const enviar = () =>
    conEspera('Enviando reporte…', async () => {
      await enviarReporte({
        franjaId: franja.id,
        franja: franja.etiqueta,
        franjaInicio: franja.inicio.toISOString(),
        franjaFin: franja.fin.toISOString(),
        extra: !!franja.extra,
        demo: !!franja.demo,
        descripcion: descripcion.trim(),
        fotosTarea: fotos,
        selfie,
        ubicacion,
      });
      Alert.alert('Reporte enviado', `Tu reporte de ${franja.etiqueta} quedó registrado.`, [
        { text: 'Listo', onPress: () => navigation.goBack() },
      ]);
    });

  return (
    <SafeAreaView style={s.fondo} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
        {/* Datos automáticos */}
        <View style={s.auto}>
          <Fila icono="time" texto={`Franja ${franja.etiqueta}${franja.extra ? ' · horas extras' : ''}`} />
          <Fila
            icono="calendar"
            texto={`${formatoFecha(ahora)} · ${hhmm(ahora)}:${String(ahora.getSeconds()).padStart(2, '0')} (hora oficial)`}
          />
          <Fila
            icono="hourglass"
            texto={
              abierta
                ? `Puedes enviarlo hasta las ${hhmm(cierreDe(franja))} (quedan ${restan} min)`
                : 'Esta hora ya cerró'
            }
            alerta={!abierta || restan <= 10}
          />
          {ubicacion ? (
            <Fila
              icono="location"
              texto={`${ubicacion.direccion ?? `${ubicacion.lat.toFixed(5)}, ${ubicacion.lng.toFixed(5)}`} (±${ubicacion.precisionM} m)`}
            />
          ) : (
            <Pressable onPress={actualizarUbicacion}>
              <Fila icono="location" texto={errorUbicacion ?? 'Obteniendo ubicación GPS…'} alerta={!!errorUbicacion} />
            </Pressable>
          )}
          {ubicacion?.simulada && <Fila icono="warning" texto="Se detectó ubicación simulada" alerta />}
        </View>

        {/* 1. Descripción */}
        <Text style={s.paso}>1. ¿Qué hiciste en esta hora?</Text>
        <TextInput
          style={s.texto}
          multiline
          maxLength={500}
          placeholder="Ej.: Entregué 3 pedidos en Laureles y recogí documentos firmados."
          placeholderTextColor={color.suave}
          value={descripcion}
          onChangeText={setDescripcion}
        />
        <Text style={s.nota}>{descripcion.length}/500</Text>

        {/* 2. Fotos de la tarea */}
        <Text style={s.paso}>
          2. Fotos de la tarea ({fotos.length}/{REPORTES.maxFotosTarea})
        </Text>
        <View style={s.fotos}>
          {fotos.map((f, i) => (
            <View key={f.uri} style={s.fotoCaja}>
              <Image source={{ uri: f.uri }} style={s.foto} />
              <Pressable style={s.quitar} onPress={() => setFotos((l) => l.filter((_, k) => k !== i))}>
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
              {f.pesoKB != null && <Text style={s.peso}>{f.pesoKB} KB</Text>}
            </View>
          ))}
          {fotos.length < REPORTES.maxFotosTarea && (
            <Pressable style={[s.fotoCaja, s.agregar]} onPress={agregarFotoCamara}>
              <Ionicons name="camera" size={26} color={color.primario} />
              <Text style={s.agregarTexto}>Tomar foto</Text>
            </Pressable>
          )}
          {REPORTES.permitirGaleriaTarea && fotos.length < REPORTES.maxFotosTarea && (
            <Pressable style={[s.fotoCaja, s.agregar]} onPress={agregarFotoGaleria}>
              <Ionicons name="images" size={26} color={color.primario} />
              <Text style={s.agregarTexto}>Galería</Text>
            </Pressable>
          )}
        </View>

        {/* 3. Selfie */}
        <Text style={s.paso}>3. Tu selfie (solo con cámara)</Text>
        <Pressable style={s.selfieCaja} onPress={hacerSelfie}>
          {selfie ? (
            <>
              <Image source={{ uri: selfie.uri }} style={s.selfie} />
              <View style={{ flex: 1 }}>
                <Text style={s.selfieOk}>Selfie registrada</Text>
                <Text style={s.nota}>
                  {hhmm(selfie.tomadaEn)} ·{' '}
                  {selfie.ubicacion
                    ? `${selfie.ubicacion.lat.toFixed(5)}, ${selfie.ubicacion.lng.toFixed(5)}`
                    : 'sin ubicación'}
                </Text>
                <Text style={s.repetir}>Tocar para repetir</Text>
              </View>
            </>
          ) : (
            <>
              <View style={[s.selfie, s.selfieVacia]}>
                <Ionicons name="person" size={28} color={color.primario} />
              </View>
              <Text style={s.agregarTexto}>Tomar selfie con la cámara frontal</Text>
            </>
          )}
        </Pressable>

        {/* Resumen y envío */}
        {pesoTotal > 0 && <Text style={s.nota}>Peso del reporte: {pesoTotal} KB (fotos comprimidas)</Text>}
        {!abierta && (
          <Text style={s.cerrada}>
            La hora {franja.etiqueta} ya cerró y este reporte no se puede enviar. Quedó registrado como "No reportó".
          </Text>
        )}
        {abierta && faltantes.length > 0 && <Text style={s.falta}>Falta: {faltantes.join(', ')}.</Text>}

        <Pressable
          style={[s.enviar, (faltantes.length > 0 || !abierta) && s.enviarOff]}
          disabled={faltantes.length > 0 || !abierta}
          onPress={enviar}
        >
          <Ionicons name="send" size={18} color="#fff" />
          <Text style={s.enviarTexto}>Enviar reporte</Text>
        </Pressable>
      </ScrollView>

      {ocupado && (
        <View style={s.cargando}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={s.cargandoTexto}>{ocupado}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function Fila({ icono, texto, alerta }) {
  return (
    <View style={s.fila}>
      <Ionicons name={icono} size={16} color={alerta ? color.rojo : color.primario} />
      <Text style={[s.filaTexto, alerta && { color: color.rojo }]}>{texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 20, gap: 10, paddingBottom: 40 },
  auto: { backgroundColor: color.tarjeta, borderRadius: 14, padding: 14, gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filaTexto: { flex: 1, color: color.texto, fontSize: 14 },
  paso: { fontWeight: '700', fontSize: 15, color: color.texto, marginTop: 8 },
  texto: {
    backgroundColor: color.tarjeta,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
    color: color.texto,
  },
  nota: { color: color.suave, fontSize: 12 },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fotoCaja: { width: 96, height: 96, borderRadius: 12, overflow: 'hidden' },
  foto: { width: '100%', height: '100%' },
  quitar: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peso: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 2,
  },
  agregar: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#fdba74',
    backgroundColor: color.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  agregarTexto: { color: color.primario, fontWeight: '600', fontSize: 13, textAlign: 'center' },
  selfieCaja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: color.tarjeta,
    borderRadius: 14,
    padding: 12,
  },
  selfie: { width: 72, height: 72, borderRadius: 36 },
  selfieVacia: { backgroundColor: color.primarioSuave, alignItems: 'center', justifyContent: 'center' },
  selfieOk: { fontWeight: '700', color: color.verde },
  repetir: { color: color.primario, fontSize: 12, marginTop: 2 },
  falta: { color: color.ambar, fontSize: 13 },
  cerrada: { color: color.rojo, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  enviar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: color.primario,
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 6,
  },
  enviarOff: { opacity: 0.4 },
  enviarTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cargando: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  cargandoTexto: { color: '#fff', fontWeight: '600' },
});
