import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { config } from '../config/app';
import { useVisitas } from '../context/VisitasContext';
import { api } from '../services/api';
import { ESTADOS, TIPOS, estadoVisita, horaCorta, textoPermanencia } from '../utils/visitas';

// "Visitas de hoy": solo lo que programó el administrador para hoy, con su estado
export default function TarjetaVisitas({ ahora, navigation }) {
  const { visitasHoy, registros, simularCambioAdministrador } = useVisitas();
  const fin = api.getHorarioDia(ahora)?.fin;

  return (
    <View style={s.tarjeta}>
      <View style={s.cab}>
        <Text style={s.titulo}>Visitas de hoy</Text>
        <Text style={s.cuenta}>{visitasHoy.length} programadas</Text>
      </View>

      {visitasHoy.length === 0 && <Text style={s.vacio}>El administrador no te programó visitas para hoy.</Text>}

      {visitasHoy.map((p) => {
        const t = TIPOS[p.tipo];
        const v = estadoVisita(p, registros[p.id], ahora, fin);
        const e = ESTADOS[v.estado];
        return (
          <Pressable
            key={p.id}
            style={({ pressed }) => [s.fila, pressed && { opacity: 0.6 }]}
            onPress={() => navigation.navigate('VisitaDetalle', { id: p.id })}
          >
            <View style={[s.icono, { backgroundColor: t.fondo }]}>
              <Ionicons name={t.icono} size={18} color={t.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.nombre} numberOfLines={1}>
                {p.titulo}
              </Text>
              <Text style={s.sub} numberOfLines={1}>
                {t.texto} · {p.hora}
                {p.tipo === 'ruta' ? ` · ${v.puntosVisitados}/${v.puntosTotal} puntos` : ''}
                {v.periodos.length
                  ? ` · ${v.periodos.length} ${v.periodos.length === 1 ? 'entrada' : 'entradas'}`
                  : v.llegada
                    ? ` · llegó ${horaCorta(v.llegada)}`
                    : ''}
                {v.permanenciaMin != null ? ` · ${textoPermanencia(v.permanenciaMin)}` : ''}
              </Text>
            </View>
            {v.alertasSalida.length > 0 && <Ionicons name="warning" size={16} color={color.rojo} />}
            {v.dentro && <Ionicons name="radio-button-on" size={14} color={color.verde} />}
            <View style={[s.chip, { backgroundColor: e.fondo }]}>
              <Ionicons name={e.icono} size={13} color={e.color} />
              <Text style={[s.chipTexto, { color: e.color }]}>{e.texto}</Text>
            </View>
          </Pressable>
        );
      })}

      {visitasHoy.length > 1 && (
        <Pressable style={s.verTodas} onPress={() => navigation.navigate('VisitasMapa')}>
          <Ionicons name="map" size={16} color={color.primario} />
          <Text style={s.verTodasTexto}>Ver todas en el mapa</Text>
        </Pressable>
      )}

      {config.modoDemo && visitasHoy.length > 0 && (
        <Pressable style={s.demo} onPress={simularCambioAdministrador}>
          <Ionicons name="flask" size={14} color={color.suave} />
          <Text style={s.demoTexto}>Demo: simular que el administrador cambia una visita</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: 16, padding: 16, gap: 10 },
  cab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontWeight: '700', fontSize: 16, color: color.texto },
  cuenta: { color: color.suave, fontSize: 12 },
  vacio: { color: color.suave },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  icono: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontWeight: '600', color: color.texto },
  sub: { color: color.suave, fontSize: 12, marginTop: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipTexto: { fontSize: 11, fontWeight: '700' },
  verTodas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: color.primario,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  verTodasTexto: { color: color.primario, fontWeight: '700' },
  demo: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingTop: 4 },
  demoTexto: { color: color.suave, fontSize: 12 },
});
