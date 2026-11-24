import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { useNotificaciones } from '../context/NotificacionesContext';

// Ícono y color de cada tipo de notificación
const TIPOS = {
  reporte: ['time', color.azul, color.azulSuave],
  no_reporto: ['close-circle', color.rojo, color.rojoSuave],
  enviado: ['checkmark-circle', color.verde, color.verdeSuave],
  exceso: ['speedometer', color.rojo, color.rojoSuave],
  visita: ['location', color.primario, color.primarioSuave],
  geocerca: ['exit', color.rojo, color.rojoSuave],
  documento: ['document-text', color.ambar, color.ambarSuave],
  documento_vencido: ['document-text', color.rojo, color.rojoSuave],
  fin_pausa: ['cafe', color.morado, color.moradoSuave],
  pausa_activa: ['body', color.morado, color.moradoSuave],
  gps_apagado: ['power', color.rojo, color.rojoSuave],
};
const tipo = (t) => TIPOS[t] ?? ['notifications', color.suave, color.fondo];

function cuando(iso) {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(hoy.getTime() - 86400000);
  const hora = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === hoy.toDateString()) return `Hoy, ${hora}`;
  if (d.toDateString() === ayer.toDateString()) return `Ayer, ${hora}`;
  return `${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}, ${hora}`;
}

// Lista de notificaciones, de la más reciente a la más antigua. Al tocar una se marca como leída y la hora
// queda registrada en la web.
export default function NotificacionesScreen() {
  const { lista, sinLeer, marcarLeida, marcarTodas } = useNotificaciones();
  const [filtro, setFiltro] = useState('todas');
  const datos = filtro === 'sinLeer' ? lista.filter((n) => !n.leida) : lista;

  return (
    <View style={s.fondo}>
      <View style={s.barra}>
        {[
          ['todas', `Todas (${lista.length})`],
          ['sinLeer', `Sin leer (${sinLeer})`],
        ].map(([k, t]) => (
          <Pressable key={k} style={[s.chip, filtro === k && s.chipSel]} onPress={() => setFiltro(k)}>
            <Text style={[s.chipTexto, filtro === k && { color: '#fff' }]}>{t}</Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        {sinLeer > 0 && (
          <Pressable onPress={marcarTodas} hitSlop={8}>
            <Text style={s.todas}>Marcar todas como leídas</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={datos}
        keyExtractor={(n) => n.id}
        contentContainerStyle={s.lista}
        ListEmptyComponent={
          <View style={s.vacio}>
            <Ionicons name="notifications-off-outline" size={40} color={color.suave} />
            <Text style={s.vacioTexto}>
              {filtro === 'sinLeer' ? 'No tienes notificaciones sin leer.' : 'Aún no tienes notificaciones.'}
            </Text>
          </View>
        }
        renderItem={({ item: n }) => {
          const [icono, c, fondo] = tipo(n.tipo);
          return (
            <Pressable
              style={[s.item, !n.leida && s.itemNuevo]}
              onPress={() => !n.leida && marcarLeida(n.id)}
              accessibilityLabel={`${n.titulo}. ${n.leida ? 'Leída' : 'Sin leer, toca para marcar como leída'}`}
            >
              <View style={[s.icono, { backgroundColor: fondo }]}>
                <Ionicons name={icono} size={22} color={c} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={s.filaTitulo}>
                  <Text style={[s.titulo, !n.leida && { fontWeight: '800' }]} numberOfLines={1}>
                    {n.titulo}
                  </Text>
                  {!n.leida && <View style={s.punto} />}
                </View>
                <Text style={s.cuerpo}>{n.cuerpo}</Text>
                <View style={s.pie}>
                  <Text style={s.hora}>{cuando(n.fecha)}</Text>
                  {n.leida ? (
                    <Text style={s.leida}>
                      <Ionicons name="checkmark-done" size={13} color={color.verde} /> Leída
                      {n.leidaEn
                        ? ` ${new Date(n.leidaEn).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}`
                        : ''}
                    </Text>
                  ) : (
                    <Text style={s.marcar}>Marcar como leída</Text>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: color.fondo },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    paddingBottom: 6,
    flexWrap: 'wrap',
  },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: color.tarjeta,
    borderWidth: 1,
    borderColor: color.borde,
  },
  chipSel: { backgroundColor: color.primario, borderColor: color.primario },
  chipTexto: { fontWeight: '700', color: color.texto, fontSize: 13 },
  todas: { color: color.primario, fontWeight: '700', fontSize: 13 },
  lista: { padding: 14, gap: 10, flexGrow: 1 },
  item: { flexDirection: 'row', gap: 12, backgroundColor: color.tarjeta, borderRadius: 14, padding: 14 },
  itemNuevo: { borderLeftWidth: 4, borderLeftColor: color.primario },
  icono: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titulo: { flex: 1, fontSize: 15, fontWeight: '600', color: color.texto },
  punto: { width: 9, height: 9, borderRadius: 5, backgroundColor: color.primario },
  cuerpo: { color: color.texto, fontSize: 13, lineHeight: 18 },
  pie: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  hora: { color: color.suave, fontSize: 12 },
  leida: { color: color.verde, fontSize: 12, fontWeight: '600' },
  marcar: { color: color.primario, fontSize: 12, fontWeight: '700' },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  vacioTexto: { color: color.suave },
});
