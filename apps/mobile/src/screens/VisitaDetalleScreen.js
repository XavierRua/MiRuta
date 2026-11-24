import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { config } from '../config/app';
import { useVisitas } from '../context/VisitasContext';
import { useFranjasHoy } from '../hooks/useFranjasHoy';
import MapaVisita from '../components/MapaVisita';
import ComoLlegar from '../components/ComoLlegar';
import { Permiso } from '../context/PermisosContext';
import { api } from '../services/api';
import { ESTADOS, TIPOS, destinoDe, estadoVisita, horaCorta, minutosEntre, textoPermanencia } from '../utils/visitas';

const REPETICION = {
  no: 'Solo una vez',
  diaria: 'Todos los días (excepto domingo)',
  lunes_viernes: 'De lunes a viernes',
  semanal: 'Semanal',
};
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Detalle de una visita programada: datos, ubicación en el mapa y registro de llegada/salida
export default function VisitaDetalleScreen({ route, navigation }) {
  const { visitasHoy, registros, tolerancia, simularLlegada, simularSalida } = useVisitas();
  const { ahora } = useFranjasHoy();
  const p = visitasHoy.find((x) => x.id === route.params.id);

  if (!p)
    return (
      <View style={[s.fondo, s.centro]}>
        <Text style={s.suave}>Esta visita ya no está programada para hoy.</Text>
      </View>
    );

  const t = TIPOS[p.tipo];
  const r = registros[p.id];
  const v = estadoVisita(p, r, ahora, api.getHorarioDia(ahora)?.fin);
  const e = ESTADOS[v.estado];
  const rep =
    REPETICION[p.repeticion.tipo] +
    (p.repeticion.tipo === 'semanal' ? `: ${p.repeticion.dias.map((d) => DIAS[d]).join(', ')}` : '');

  return (
    <ScrollView style={s.fondo} contentContainerStyle={s.contenido}>
      <View style={s.tarjeta}>
        <View style={s.fila}>
          <View style={[s.icono, { backgroundColor: t.fondo }]}>
            <Ionicons name={t.icono} size={22} color={t.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.titulo}>{p.titulo}</Text>
            <Text style={s.suave}>
              {t.texto} · llegada estimada {p.hora}
            </Text>
          </View>
        </View>
        <View style={[s.estado, { backgroundColor: e.fondo }]}>
          <Ionicons name={e.icono} size={18} color={e.color} />
          <Text style={[s.estadoTexto, { color: e.color }]}>{e.texto}</Text>
        </View>
        {!!p.descripcion && <Text style={s.descripcion}>{p.descripcion}</Text>}
        <Text style={s.suave}>
          <Ionicons name="repeat" size={13} /> {rep}
        </Text>
      </View>

      <View style={s.tarjeta}>
        <View style={s.cab}>
          <Text style={s.seccion}>Registro de hoy</Text>
          <View style={s.auto}>
            <Ionicons name="lock-closed" size={11} color={color.suave} />
            <Text style={s.autoTexto}>Automático por GPS</Text>
          </View>
        </View>
        <View style={s.registro}>
          <Celda titulo={p.tipo === 'ruta' ? 'Llegada' : 'Primera entrada'} valor={horaCorta(v.llegada)} />
          <Celda
            titulo={p.tipo === 'ruta' ? 'Salida' : 'Última salida'}
            valor={v.salida ? horaCorta(v.salida) : v.llegada ? 'En el lugar' : '—'}
          />
          <Celda titulo={p.tipo === 'ruta' ? 'Duración' : 'Tiempo dentro'} valor={textoPermanencia(v.permanenciaMin)} />
        </View>

        {/* Ahora mismo: dentro, o fuera esperando la tolerancia */}
        {v.dentro && (
          <View style={[s.ahora, { backgroundColor: color.verdeSuave }]}>
            <Ionicons name="radio-button-on" size={14} color={color.verde} />
            <Text style={[s.ahoraTexto, { color: color.verde }]}>Estás dentro del área asignada</Text>
          </View>
        )}
        {v.fuera && (
          <View style={[s.ahora, { backgroundColor: color.ambarSuave }]}>
            <Ionicons name="time" size={14} color={color.ambar} />
            <Text style={[s.ahoraTexto, { color: color.ambar }]}>
              Fuera del área desde las {horaCorta(v.fuera.desde)}. Si no regresas, la salida se registra a las{' '}
              {horaCorta(new Date(new Date(v.fuera.desde).getTime() + tolerancia * 60000).toISOString())}.
            </Text>
          </View>
        )}

        {/* Cada entrada y salida por separado */}
        {v.periodos.length > 0 && (
          <View style={s.periodos}>
            {v.periodos.map((x, i) => (
              <View key={i} style={s.periodo}>
                <Text style={s.periodoNum}>{i + 1}</Text>
                <Ionicons name="log-in" size={15} color={color.verde} />
                <Text style={s.periodoHora}>{horaCorta(x.entrada)}</Text>
                <Ionicons name="log-out" size={15} color={x.salida ? color.rojo : color.suave} />
                <Text style={s.periodoHora}>{x.salida ? horaCorta(x.salida) : 'dentro'}</Text>
                <Text style={s.periodoDur}>{textoPermanencia(minutosEntre(x.entrada, x.salida ?? ahora))}</Text>
              </View>
            ))}
            {v.periodos.length > 1 && (
              <Text style={s.total}>
                Total del día ({v.periodos.length} entradas): {textoPermanencia(v.permanenciaMin)}
              </Text>
            )}
          </View>
        )}

        {/* Alertas de salida del área (solo cuando es su única visita del día) */}
        {v.alertasSalida.map((a, i) => (
          <View key={i} style={[s.ahora, { backgroundColor: color.rojoSuave }]}>
            <Ionicons name="warning" size={14} color={color.rojo} />
            <Text style={[s.ahoraTexto, { color: color.rojo }]}>
              Salió del área asignada a las {horaCorta(a.hora)}. Se avisó al administrador.
            </Text>
          </View>
        ))}

        <Text style={s.nota}>
          {p.tipo === 'ruta'
            ? 'Se marca cumplida cuando el GPS confirma que llegaste al último punto de la ruta, en orden.'
            : `La entrada y la salida se registran solas al entrar o salir de ${p.tipo === 'obra' ? `la geocerca (${p.radio} m alrededor del lugar)` : 'la zona'}. La salida se confirma después de ${tolerancia} min fuera, para evitar saltos del GPS. Este registro no se puede modificar.`}
        </Text>
        <MapaVisita p={p} periodos={v.periodos} recorrido={registros[p.id]?.recorrido ?? []} />
        {(registros[p.id]?.recorrido?.length ?? 0) > 1 && (
          <Text style={s.nota}>Línea azul: recorrido realizado · verde: entradas · rojo: salidas.</Text>
        )}
      </View>

      <View style={s.tarjeta}>
        <Text style={s.seccion}>
          {p.tipo === 'ruta' ? `Puntos de la ruta (${v.puntosVisitados}/${v.puntosTotal})` : 'Ubicación'}
        </Text>
        {p.tipo === 'zona' ? (
          <Text style={s.suave}>
            {p.puntos[0]?.direccion ? `${p.puntos[0].direccion} · ` : ''}Área marcada en el mapa por el administrador.
          </Text>
        ) : (
          p.puntos.map((pt, i) => {
            const rp = r?.puntos?.[i];
            return (
              <View key={i} style={s.punto}>
                <View style={[s.num, rp?.llegada && { backgroundColor: color.verde }]}>
                  {rp?.llegada ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : (
                    <Text style={s.numTexto}>{i + 1}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.puntoNombre}>{pt.nombre}</Text>
                  <Text style={s.suave}>{pt.direccion}</Text>
                  {rp?.llegada && (
                    <Text style={s.puntoHora}>
                      Llegó {horaCorta(rp.llegada)}
                      {rp.salida ? ` · salió ${horaCorta(rp.salida)}` : ''}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={s.botones}>
          <Permiso clave="visitas.verUbicacion">
            <Pressable style={s.botonSec} onPress={() => navigation.navigate('UbicacionVisita', { id: p.id })}>
              <Ionicons name="map" size={18} color={color.primario} />
              <Text style={s.botonSecTexto}>Ver ubicación</Text>
            </Pressable>
          </Permiso>
          <Permiso clave="visitas.comoLlegar">
            <ComoLlegar destino={destinoDe(p, r)} />
          </Permiso>
        </View>
      </View>

      {config.modoDemo && (
        <View style={s.demo}>
          <Text style={s.suave}>Solo en modo demo (pruebas sin moverte; el trabajador no verá estos botones):</Text>
          <View style={s.fila}>
            <Pressable style={s.botonDemo} onPress={() => simularLlegada(p)}>
              <Text style={s.botonDemoTexto}>
                {p.tipo === 'ruta' ? 'Llegar al siguiente punto' : 'Simular llegada'}
              </Text>
            </Pressable>
            <Pressable style={s.botonDemo} onPress={() => simularSalida(p)}>
              <Text style={s.botonDemoTexto}>Simular salida</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function Celda({ titulo, valor }) {
  return (
    <View style={s.celda}>
      <Text style={s.celdaValor}>{valor}</Text>
      <Text style={s.suave}>{titulo}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  botones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  botonSec: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: color.primario,
    borderRadius: 12,
    padding: 13,
  },
  botonSecTexto: { color: color.primario, fontWeight: '700' },
  cab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  auto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: color.fondo,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  autoTexto: { color: color.suave, fontSize: 11, fontWeight: '600' },
  ahora: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10 },
  ahoraTexto: { flex: 1, fontSize: 13, fontWeight: '600' },
  periodos: { gap: 6 },
  periodo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: color.fondo,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  periodoNum: { width: 18, color: color.suave, fontWeight: '700' },
  periodoHora: { color: color.texto, fontWeight: '700', fontVariant: ['tabular-nums'], marginRight: 6 },
  periodoDur: { marginLeft: 'auto', color: color.suave, fontSize: 12 },
  total: { color: color.texto, fontWeight: '700', textAlign: 'right' },
  fondo: { flex: 1, backgroundColor: color.fondo },
  centro: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  contenido: { padding: 20, gap: 12 },
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: 16, padding: 16, gap: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 18, fontWeight: '800', color: color.texto },
  suave: { color: color.suave, fontSize: 13 },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  estadoTexto: { fontWeight: '700' },
  descripcion: { color: color.texto, lineHeight: 20 },
  seccion: { fontWeight: '700', fontSize: 16, color: color.texto },
  registro: { flexDirection: 'row', gap: 8 },
  celda: { flex: 1, backgroundColor: color.fondo, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 },
  celdaValor: { fontWeight: '800', color: color.texto, fontSize: 15 },
  nota: { color: color.suave, fontSize: 12 },
  punto: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  num: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color.azul,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  numTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  puntoNombre: { fontWeight: '600', color: color.texto },
  puntoHora: { color: color.verde, fontSize: 12, marginTop: 2 },
  boton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.primario,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  botonTexto: { color: '#fff', fontWeight: '700' },
  demo: { gap: 8, alignItems: 'center' },
  botonDemo: {
    borderWidth: 1,
    borderColor: color.borde ?? '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  botonDemoTexto: { color: color.texto, fontWeight: '600' },
});
