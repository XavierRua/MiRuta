import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { useNotificaciones } from '../context/NotificacionesContext';
import { Permiso } from '../context/PermisosContext';
import LogoEmpresa from './LogoEmpresa';
import MenuLateral from './MenuLateral';

// Encabezado de todas las pestañas: menú (☰), logo de la empresa y campana de notificaciones con el contador.
export default function Encabezado() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { sinLeer } = useNotificaciones();
  const [menu, setMenu] = useState(false);

  return (
    <View style={[s.barra, { paddingTop: insets.top + 6 }]}>
      <Pressable style={s.boton} onPress={() => setMenu(true)} hitSlop={8} accessibilityLabel="Abrir menú">
        <Ionicons name="menu" size={28} color={color.texto} />
      </Pressable>

      <View style={s.logo}>
        <LogoEmpresa />
      </View>

      <Permiso clave="notificaciones.ver">
        <Pressable
          style={s.boton}
          onPress={() => navigation.navigate('Notificaciones')}
          hitSlop={8}
          accessibilityLabel={`Notificaciones, ${sinLeer} sin leer`}
        >
          <Ionicons name={sinLeer ? 'notifications' : 'notifications-outline'} size={26} color={color.texto} />
          {sinLeer > 0 && (
            <View style={s.contador}>
              <Text style={s.contadorTexto}>{sinLeer > 99 ? '99+' : sinLeer}</Text>
            </View>
          )}
        </Pressable>
      </Permiso>

      <MenuLateral visible={menu} onCerrar={() => setMenu(false)} navigation={navigation} />
    </View>
  );
}

const s = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: color.tarjeta,
    borderBottomWidth: 1,
    borderBottomColor: color.borde,
  },
  boton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  logo: { flex: 1, alignItems: 'flex-start', justifyContent: 'center', height: 40 },
  contador: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: color.rojo,
    borderWidth: 2,
    borderColor: color.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
