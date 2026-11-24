import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { CREDITOS, VERSION_APP } from '../config/app';
import { api } from '../services/api';
import { useSesion } from '../context/SesionContext';
import LogoEmpresa from './LogoEmpresa';

// Menú lateral (☰). Arriba: Seguridad. Abajo: textos legales y cerrar sesión. Pie: créditos y versión.
export default function MenuLateral({ visible, onCerrar, navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ancho = Math.min(340, width * 0.84);
  const { salir } = useSesion();
  const { yo } = api.getPerfil();
  const x = useRef(new Animated.Value(-ancho)).current;
  const [montado, setMontado] = useState(visible);

  useEffect(() => {
    if (visible) setMontado(true);
    Animated.timing(x, { toValue: visible ? 0 : -ancho, duration: 220, useNativeDriver: true }).start(() => {
      if (!visible) setMontado(false);
    });
  }, [visible, ancho, x]);

  const ir = (pantalla, params) => {
    onCerrar();
    navigation.navigate(pantalla, params);
  };

  return (
    <Modal visible={montado} transparent animationType="none" onRequestClose={onCerrar} statusBarTranslucent>
      <Pressable style={s.velo} onPress={onCerrar} accessibilityLabel="Cerrar menú" />
      <Animated.View style={[s.panel, { width: ancho, paddingTop: insets.top + 8, transform: [{ translateX: x }] }]}>
        <View style={s.cab}>
          <LogoEmpresa alto={28} />
          <Pressable onPress={onCerrar} hitSlop={10} accessibilityLabel="Cerrar menú">
            <Ionicons name="close" size={28} color={color.primario} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[s.contenido, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={s.hola}>
            Hola, {yo.nombres} {yo.apellidos}
          </Text>

          {/* Parte superior */}
          <Pressable style={s.opcion} onPress={() => ir('Seguridad')}>
            <Ionicons name="shield-checkmark-outline" size={24} color={color.texto} />
            <Text style={s.opcionTexto}>Seguridad</Text>
            <Ionicons name="chevron-forward" size={20} color={color.suave} />
          </Pressable>

          <View style={{ flex: 1, minHeight: 40 }} />

          {/* Parte inferior */}
          <View style={s.enlaces}>
            <Pressable onPress={() => ir('Legal', { doc: 'privacidad' })}>
              <Text style={s.enlace}>Política de privacidad</Text>
            </Pressable>
            <Pressable onPress={() => ir('Legal', { doc: 'terminos' })}>
              <Text style={s.enlace}>Términos y condiciones</Text>
            </Pressable>
            <Pressable onPress={() => ir('Autorizacion', { soloLectura: true })}>
              <Text style={s.enlace}>Tratamiento de datos personales</Text>
            </Pressable>
          </View>

          <Pressable
            style={s.salir}
            onPress={() => {
              onCerrar();
              salir();
            }}
          >
            <Ionicons name="log-out-outline" size={22} color={color.rojo} />
            <Text style={s.salirTexto}>Cerrar sesión</Text>
          </Pressable>

          {/* Pie */}
          <View style={s.pie}>
            <Text style={s.pieFuerte}>{CREDITOS.autor}</Text>
            <Text style={s.pieTexto}>{CREDITOS.ciudad}</Text>
            <Text style={s.pieTexto}>{CREDITOS.correo}</Text>
            <Text style={s.pieTexto}>© Todos los derechos reservados</Text>
            <Text style={s.pieTexto}>Versión {VERSION_APP}</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  velo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,24,39,0.45)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: color.tarjeta,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  cab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: color.borde,
  },
  contenido: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20 },
  hola: { fontSize: 24, fontWeight: '800', color: color.texto, marginBottom: 18 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 },
  opcionTexto: { flex: 1, fontSize: 17, color: color.texto },
  enlaces: { gap: 16, marginBottom: 18 },
  enlace: { color: color.primario, fontSize: 15, textDecorationLine: 'underline' },
  salir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: color.borde,
  },
  salirTexto: { color: color.rojo, fontWeight: '700', fontSize: 16 },
  pie: { borderTopWidth: 1, borderTopColor: color.borde, paddingTop: 14, gap: 2 },
  pieFuerte: { color: color.texto, fontWeight: '700', fontSize: 13 },
  pieTexto: { color: color.suave, fontSize: 12 },
});
