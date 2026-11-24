import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { config } from '../config/app';
import { api } from '../services/api';
import { useSesion } from '../context/SesionContext';
import { useDocumentos } from '../context/DocumentosContext';
import { Permiso } from '../context/PermisosContext';
import { CLAVES, borrarClave, guardar, leer } from '../services/almacen';

// Menú → Seguridad: cambiar la contraseña (PIN) y eliminar la cuenta (antes estaba en Mi perfil)
export default function SeguridadScreen({ navigation }) {
  const { desvincularDemo } = useSesion();
  const { borrarTodo } = useDocumentos();

  // Eliminación de la cuenta: el trabajador la solicita y el administrador la aprueba
  const [eliminacion, setEliminacion] = useState(null);
  useEffect(() => {
    leer(CLAVES.eliminacion)
      .then(setEliminacion)
      .catch(() => {});
  }, []);
  const solicitarEliminacion = () =>
    Alert.alert(
      'Eliminar mi cuenta',
      'Se enviará una solicitud al administrador. Cuando la apruebe, se borrarán tus datos personales, fotos y documentos de MiRuta y este celular quedará desvinculado. La empresa puede conservar los registros que la ley le exige guardar (por ejemplo, los de seguridad y salud en el trabajo).',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar solicitud',
          style: 'destructive',
          onPress: async () => {
            const r = await api.solicitarEliminacionPerfil('Solicitada desde la app');
            await guardar(CLAVES.eliminacion, r);
            setEliminacion(r);
          },
        },
      ],
    );
  const cancelarEliminacion = async () => {
    await api.cancelarEliminacionPerfil();
    await borrarClave(CLAVES.eliminacion);
    setEliminacion(null);
  };
  // Solo demo: lo que pasa cuando el administrador aprueba
  const aprobarDemo = () => {
    borrarTodo();
    desvincularDemo();
  };

  return (
    <ScrollView style={s.fondo} contentContainerStyle={s.contenido}>
      <Permiso clave="seguridad.cambiarPin">
        <Pressable style={s.opcion} onPress={() => navigation.navigate('CambiarPin')}>
          <View style={s.icono}>
            <Ionicons name="key-outline" size={22} color={color.primario} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.opcionTexto}>Cambiar contraseña</Text>
            <Text style={s.nota}>Tu PIN para entrar a MiRuta en este celular</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={color.suave} />
        </Pressable>
      </Permiso>

      <Permiso clave="perfil.solicitarEliminacion">
        {eliminacion ? (
          <View style={s.eliminacion}>
            <View style={s.eliminacionCab}>
              <Ionicons name="time" size={18} color={color.ambar} />
              <Text style={s.eliminacionTitulo}>Solicitud de eliminación pendiente</Text>
            </View>
            <Text style={s.nota}>
              Enviada el {new Date(eliminacion.solicitadaEn).toLocaleDateString('es-CO')}. Tu cuenta se eliminará cuando
              el administrador la apruebe.
            </Text>
            <Pressable onPress={cancelarEliminacion}>
              <Text style={s.cancelar}>Cancelar solicitud</Text>
            </Pressable>
            {config.modoDemo && (
              <Pressable onPress={aprobarDemo}>
                <Text style={s.demo}>Simular que el administrador la aprueba (solo en la demo)</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable style={s.opcion} onPress={solicitarEliminacion}>
            <View style={[s.icono, { backgroundColor: color.rojoSuave }]}>
              <Ionicons name="trash-outline" size={22} color={color.rojo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.opcionTexto, { color: color.rojo }]}>Eliminar mi cuenta</Text>
              <Text style={s.nota}>Requiere aprobación del administrador</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={color.suave} />
          </Pressable>
        )}
      </Permiso>

      {config.modoDemo && (
        <Pressable onPress={desvincularDemo}>
          <Text style={s.demo}>Desvincular este celular (solo en la demo)</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 20, gap: 12 },
  opcion: {
    backgroundColor: color.tarjeta,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  icono: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: color.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionTexto: { fontWeight: '700', fontSize: 16, color: color.texto },
  nota: { color: color.suave, fontSize: 12, lineHeight: 17, marginTop: 2 },
  eliminacion: { backgroundColor: color.ambarSuave, borderRadius: 14, padding: 16, gap: 8 },
  eliminacionCab: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eliminacionTitulo: { fontWeight: '700', color: color.ambar },
  cancelar: { color: color.primario, fontWeight: '700' },
  demo: { color: color.suave, textAlign: 'center', fontSize: 12, textDecorationLine: 'underline', marginTop: 4 },
});
