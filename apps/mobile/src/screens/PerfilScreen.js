import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import Seccion from '../components/Seccion';
import Fila from '../components/Fila';
import { useSesion } from '../context/SesionContext';
import { api } from '../services/api';
import { config } from '../config/app';
export default function PerfilScreen({ navigation }) {
  const { salir, vinculo, desvincularDemo } = useSesion();
  const { yo, vehiculo, horario } = api.getPerfil();
  return (
    <SafeAreaView style={s.fondo} edges={['top']}>
      <ScrollView contentContainerStyle={s.contenido}>
        <View style={s.cabecera}>
          <View style={s.avatar}>
            <Text style={s.avatarTexto}>
              {yo.nombres[0]}
              {yo.apellidos[0]}
            </Text>
          </View>
          <Text style={s.nombre}>
            {yo.nombres} {yo.apellidos}
          </Text>
          <Text style={s.cargo}>
            {yo.cargo} · {yo.grupo}
          </Text>
        </View>

        <Seccion titulo="Mi vehículo">
          <View style={s.placaFila}>
            <Text style={s.placa}>{vehiculo.placa}</Text>
            <Text style={s.vehDesc}>{vehiculo.descripcion}</Text>
          </View>
          <Fila k="Propietario" v={vehiculo.propietario} />
          <Fila k="SOAT" v={`Vigente hasta ${vehiculo.soat.fecha}`} ok />
          <Fila k="Técnico-mecánica" v={`Vigente hasta ${vehiculo.tecnomecanica.fecha}`} ok />
          <Fila k="Licencia" v={yo.licencia} />
        </Seccion>

        <Seccion titulo="Mi horario">
          {horario.semana.map((h) => (
            <Fila key={h.dia} k={h.dia} v={h.horas} />
          ))}
        </Seccion>

        <Seccion titulo="Datos personales">
          <Fila k="Cédula" v={yo.cedula} />
          <Fila k="Teléfono" v={yo.telefono} />
          <Fila k="EPS / ARL" v={`${yo.eps} / ${yo.arl}`} />
          <Fila k="Tipo de sangre" v={yo.tipoSangre} />
          <Fila k="Emergencia" v={yo.contactoEmergencia} />
        </Seccion>

        <Pressable style={s.enlace} onPress={() => navigation.navigate('Autorizacion', { soloLectura: true })}>
          <Ionicons name="document-text-outline" size={20} color={color.texto} />
          <Text style={s.enlaceTexto}>Ver autorización de datos (v1.0)</Text>
          <Ionicons name="chevron-forward" size={18} color={color.suave} />
        </Pressable>
        <Seccion titulo="Este celular">
          <Fila k="Equipo" v={vinculo?.celular?.modelo ?? '—'} />
          <Fila k="Vinculado el" v={vinculo ? new Date(vinculo.vinculadoEn).toLocaleDateString('es-CO') : '—'} />
          <Text style={s.notaCelular}>
            Tu cuenta solo funciona en este celular. Si cambias de equipo, pide un código de activación nuevo.
          </Text>
        </Seccion>

        <Pressable style={s.enlace} onPress={salir}>
          <Ionicons name="log-out-outline" size={20} color={color.rojo} />
          <Text style={[s.enlaceTexto, { color: color.rojo }]}>Cerrar sesión (pedir PIN)</Text>
        </Pressable>
        {config.modoDemo && (
          <Pressable onPress={desvincularDemo}>
            <Text style={s.demo}>Desvincular este celular (solo en la demo)</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  notaCelular: { color: color.suave, fontSize: 12, lineHeight: 17 },
  demo: { color: color.suave, textAlign: 'center', fontSize: 12, textDecorationLine: 'underline', marginTop: 4 },
  fondo: { flex: 1, backgroundColor: color.fondo },
  contenido: { padding: 20, gap: 14 },
  cabecera: { alignItems: 'center', marginBottom: 4 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontSize: 28, fontWeight: '800', color: '#9a3412' },
  nombre: { fontSize: 22, fontWeight: '800', color: color.texto, marginTop: 10 },
  cargo: { color: color.suave },
  seccion: { backgroundColor: color.tarjeta, borderRadius: 16, padding: 16, gap: 10 },
  seccionTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: color.suave,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placaFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  placa: {
    backgroundColor: '#fde047',
    borderWidth: 2,
    borderColor: color.texto,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontWeight: '800',
    letterSpacing: 1,
  },
  vehDesc: { flex: 1, color: color.texto },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  k: { color: color.suave },
  v: { color: color.texto, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  enlace: {
    backgroundColor: color.tarjeta,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  enlaceTexto: { flex: 1, fontWeight: '600', color: color.texto },
});
