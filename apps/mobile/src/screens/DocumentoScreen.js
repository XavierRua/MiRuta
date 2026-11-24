import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import TomarDocumento from '../components/TomarDocumento';
import { useDocumentos } from '../context/DocumentosContext';
import { fechaLarga } from '../utils/documentos';

// Detalle de un documento: foto, vencimiento, estado y versiones anteriores.
// Vehículo: el trabajador lo renueva con una foto nueva. Adicionales: solo lectura (los actualiza SST).
export default function DocumentoScreen({ route }) {
  const { todos, guardarDocumento } = useDocumentos();
  const doc = todos.find((d) => d.id === route.params.id);
  const [renovando, setRenovando] = useState(null); // { foto, vence } mientras renueva
  const [guardando, setGuardando] = useState(false);
  if (!doc) return null;
  const e = doc.estado;
  const esVehiculo = doc.grupo === 'vehiculo';
  const sinCargar = esVehiculo ? !doc.foto : !doc.cargado;

  const guardar = async () => {
    try {
      setGuardando(true);
      await guardarDocumento(doc.id, renovando.foto, renovando.vence);
      setRenovando(null);
      Alert.alert('Documento actualizado', 'La versión anterior quedó guardada en el historial.');
    } catch (err) {
      Alert.alert('No se pudo guardar', err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ScrollView style={s.fondo} contentContainerStyle={s.contenido}>
      <View style={s.tarjeta}>
        <Text style={s.titulo}>{doc.nombre}</Text>
        {e && !sinCargar && (
          <View style={[s.estado, { backgroundColor: e.fondo }]}>
            <View style={[s.punto, { backgroundColor: e.color }]} />
            <Text style={[s.estadoTexto, { color: e.color }]}>
              {e.texto}
              {doc.vence ? ` · vigente hasta ${fechaLarga(doc.vence)}` : ''}
            </Text>
          </View>
        )}
        {doc.foto?.uri && <Image source={{ uri: doc.foto.uri }} style={s.foto} resizeMode="contain" />}
        {!esVehiculo && doc.cargado && (
          <View style={s.archivo}>
            <Ionicons name="document-attach" size={22} color={color.primario} />
            <View style={{ flex: 1 }}>
              <Text style={s.archivoTexto}>{doc.detalle}</Text>
              <Text style={s.suave}>
                Subido por {doc.subidoPor} el {fechaLarga(doc.subidoEn)}
              </Text>
            </View>
          </View>
        )}
        {sinCargar && (
          <Text style={s.suave}>
            {esVehiculo
              ? 'Aún no has tomado la foto de este documento.'
              : 'La persona de SST aún no ha subido este documento.'}
          </Text>
        )}
        {esVehiculo && doc.foto && (
          <Text style={s.suave}>
            Versión {doc.version} · actualizado el {fechaLarga(doc.subidoEn?.slice(0, 10))} · {doc.foto.pesoKB ?? '?'}{' '}
            KB
          </Text>
        )}
        {doc.privado && (
          <View style={s.privado}>
            <Ionicons name="lock-closed" size={14} color={color.suave} />
            <Text style={s.suave}>Documento privado: solo lo ven tú, la persona de SST y el administrador.</Text>
          </View>
        )}
        {!esVehiculo && (
          <View style={s.privado}>
            <Ionicons name="information-circle" size={14} color={color.suave} />
            <Text style={s.suave}>Este documento lo sube y actualiza únicamente la persona de SST.</Text>
          </View>
        )}
      </View>

      {/* Renovar un documento del vehículo */}
      {esVehiculo &&
        (renovando ? (
          <>
            <TomarDocumento doc={doc} valor={renovando} onCambiar={setRenovando} />
            <View style={s.botones}>
              <Pressable style={s.secundario} onPress={() => setRenovando(null)}>
                <Text style={s.secundarioTexto}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[s.boton, !renovando.foto && s.botonOff]}
                disabled={!renovando.foto || guardando}
                onPress={guardar}
              >
                {guardando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.botonTexto}>Guardar nueva versión</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable style={s.boton} onPress={() => setRenovando({})}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={s.botonTexto}>{doc.foto ? 'Actualizar (lo renové)' : 'Tomar foto'}</Text>
          </Pressable>
        ))}

      {/* Versiones anteriores */}
      {esVehiculo && doc.historial?.length > 0 && (
        <View style={s.tarjeta}>
          <Text style={s.seccion}>Versiones anteriores</Text>
          {doc.historial.map((h) => (
            <View key={h.version} style={s.version}>
              {h.foto?.uri && <Image source={{ uri: h.foto.uri }} style={s.mini} />}
              <View style={{ flex: 1 }}>
                <Text style={s.versionTexto}>Versión {h.version}</Text>
                <Text style={s.suave}>
                  {h.vence ? `Vencía el ${fechaLarga(h.vence)}` : 'Sin vencimiento'} · subida el{' '}
                  {fechaLarga(h.subidoEn?.slice(0, 10))}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 20, gap: 12 },
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: 16, padding: 16, gap: 10 },
  titulo: { fontSize: 20, fontWeight: '800', color: color.texto },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  punto: { width: 9, height: 9, borderRadius: 5 },
  estadoTexto: { fontWeight: '700' },
  foto: { width: '100%', height: 220, borderRadius: 12, backgroundColor: color.fondo },
  archivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: color.fondo,
    borderRadius: 12,
    padding: 12,
  },
  archivoTexto: { color: color.texto, fontWeight: '600' },
  suave: { color: color.suave, fontSize: 13, flexShrink: 1 },
  privado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seccion: { fontWeight: '700', fontSize: 16, color: color.texto },
  version: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mini: { width: 56, height: 40, borderRadius: 6, backgroundColor: color.fondo },
  versionTexto: { color: color.texto, fontWeight: '600' },
  botones: { flexDirection: 'row', gap: 10 },
  boton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.primario,
    borderRadius: 14,
    padding: 15,
  },
  botonOff: { opacity: 0.45 },
  botonTexto: { color: '#fff', fontWeight: '700' },
  secundario: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: color.borde,
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
  },
  secundarioTexto: { color: color.texto, fontWeight: '700' },
});
