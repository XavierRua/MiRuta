import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { api } from '../services/api';
import { useDocumentos } from '../context/DocumentosContext';
import { useJornadaDia } from '../context/JornadaDiaContext';
import { ahoraServidor } from '../services/horaServidor';
import { partesColombia } from '../utils/horaColombia';

const ICONO = { moto: 'motorbike', carro: 'car', camion: 'truck' };
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Preoperacional: con qué vehículo trabaja hoy (propio, de la empresa o ninguno) y su lista de verificación.
// Si hoy tiene pico y placa, ese vehículo no puede salir. Si algún ítem queda en mal estado, se alerta.
export default function FormularioPreoperacional({ onEnviar }) {
  const { itemsPreoperacional } = api.getFormularios();
  const propio = api.getPerfil().vehiculo;
  const empresa = api.getVehiculosEmpresa();
  const { picoPlacaPropio } = useJornadaDia();
  const { todos } = useDocumentos();
  const hoy = partesColombia(ahoraServidor()).diaSemana;

  const opciones = [
    {
      uso: 'propio',
      placa: propio.placa,
      clase: propio.tipo ?? 'moto',
      descripcion: propio.descripcion,
      picoPlaca: picoPlacaPropio,
    },
    ...empresa.map((v) => ({ uso: 'empresa', ...v })),
    {
      uso: 'ninguno',
      placa: null,
      clase: null,
      descripcion: 'Hoy no uso vehículo (a pie o transporte público)',
      picoPlaca: [],
    },
  ];
  const [elegido, setElegido] = useState(null);
  const [estado, setEstado] = useState({}); // { itemId: 'bien' | 'mal' | 'na' }
  const [obs, setObs] = useState({});
  const [enviando, setEnviando] = useState(false);

  const tienePicoPlaca = (v) => v?.picoPlaca?.includes(hoy);
  // Documentos al día: solo se pueden revisar los del vehículo propio (los de la empresa los controla el administrador)
  const docsVencidos = todos.filter(
    (d) => ['soat', 'tecnomecanica'].includes(d.id) && d.estado?.clave === 'vencido' && d.foto,
  );
  const items = useMemo(
    () => (elegido?.clase ? itemsPreoperacional.filter((i) => i.aplica.includes(elegido.clase)) : []),
    [elegido?.placa],
  );
  const valorItem = (i) =>
    i.automatico ? (elegido?.uso === 'propio' && docsVencidos.length ? 'mal' : 'bien') : estado[i.id];
  const fallas = items.filter((i) => valorItem(i) === 'mal');
  const faltan = items.filter((i) => !valorItem(i) || (valorItem(i) === 'mal' && !i.automatico && !obs[i.id]?.trim()));
  const bloqueado = tienePicoPlaca(elegido);

  const enviar = async () => {
    setEnviando(true);
    try {
      await onEnviar({
        vehiculo: { uso: elegido.uso, placa: elegido.placa, clase: elegido.clase },
        items: items.map((i) => ({ id: i.id, texto: i.texto, estado: valorItem(i), observacion: obs[i.id] ?? null })),
        fallas: fallas.map((i) => i.texto),
        alerta: fallas.length > 0,
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.seccion}>¿Con qué vehículo trabajas hoy?</Text>
      {opciones.map((v) => {
        const sel = elegido?.uso === v.uso && elegido?.placa === v.placa;
        const pico = tienePicoPlaca(v);
        return (
          <Pressable
            key={`${v.uso}${v.placa}`}
            style={[s.vehiculo, sel && s.vehiculoSel]}
            onPress={() => setElegido(v)}
          >
            <MaterialCommunityIcons
              name={ICONO[v.clase] ?? 'walk'}
              size={24}
              color={sel ? color.primario : color.suave}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.vehiculoTitulo}>
                {v.uso === 'propio' ? 'Mi vehículo' : v.uso === 'empresa' ? 'Vehículo de la empresa' : 'Sin vehículo'}
                {v.placa ? ` · ${v.placa}` : ''}
              </Text>
              <Text style={s.sub}>{v.descripcion}</Text>
              {pico && <Text style={s.pico}>Hoy tiene pico y placa</Text>}
            </View>
            {sel && <Ionicons name="checkmark-circle" size={22} color={color.primario} />}
          </Pressable>
        );
      })}

      {bloqueado && (
        <View style={s.alerta}>
          <Ionicons name="close-circle" size={20} color={color.rojo} />
          <Text style={s.alertaTexto}>
            {elegido.placa} tiene pico y placa los {elegido.picoPlaca.map((d) => DIAS[d]).join(', ')}. No puede salir
            hoy: elige otro vehículo o "Sin vehículo".
          </Text>
        </View>
      )}

      {!bloqueado && items.length > 0 && (
        <>
          <Text style={s.seccion}>Lista de verificación</Text>
          {items.map((i) => {
            const v = valorItem(i);
            return (
              <View key={i.id} style={s.item}>
                <Text style={s.itemTexto}>{i.texto}</Text>
                {i.automatico ? (
                  <Text style={[s.auto, v === 'mal' && { color: color.rojo }]}>
                    {elegido.uso !== 'propio'
                      ? 'Los controla el administrador'
                      : v === 'mal'
                        ? `Vencido: ${docsVencidos.map((d) => d.nombre).join(', ')}`
                        : 'Al día (según tu perfil)'}
                  </Text>
                ) : (
                  <View style={s.estados}>
                    {[
                      ['bien', 'Bien', color.verde],
                      ['mal', 'Mal', color.rojo],
                      ['na', 'No aplica', color.suave],
                    ].map(([k, t, c]) => (
                      <Pressable
                        key={k}
                        style={[s.estado, v === k && { backgroundColor: c, borderColor: c }]}
                        onPress={() => setEstado({ ...estado, [i.id]: k })}
                      >
                        <Text style={[s.estadoTexto, v === k && { color: '#fff' }]}>{t}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {v === 'mal' && !i.automatico && (
                  <TextInput
                    style={s.input}
                    placeholder="¿Qué le pasa? (obligatorio)"
                    value={obs[i.id] ?? ''}
                    onChangeText={(t) => setObs({ ...obs, [i.id]: t })}
                  />
                )}
              </View>
            );
          })}
          {fallas.length > 0 && (
            <View style={s.alerta}>
              <Ionicons name="warning" size={18} color={color.rojo} />
              <Text style={s.alertaTexto}>
                Se avisará al administrador y a tu supervisor. No uses el vehículo hasta que te autoricen.
              </Text>
            </View>
          )}
        </>
      )}

      <Pressable
        style={[s.boton, (!elegido || bloqueado || faltan.length > 0) && s.botonOff]}
        disabled={!elegido || bloqueado || faltan.length > 0 || enviando}
        onPress={enviar}
      >
        {enviando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.botonTexto}>
            {!elegido
              ? 'Elige el vehículo'
              : faltan.length
                ? `Revisa ${faltan.length} ítem(s) más`
                : 'Enviar preoperacional'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  seccion: { fontWeight: '800', color: color.texto, fontSize: 16, marginTop: 4 },
  vehiculo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: color.tarjeta,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  vehiculoSel: { borderColor: color.primario },
  vehiculoTitulo: { fontWeight: '700', color: color.texto },
  sub: { color: color.suave, fontSize: 12, marginTop: 2 },
  pico: { color: color.rojo, fontWeight: '700', fontSize: 12, marginTop: 4 },
  alerta: { flexDirection: 'row', gap: 8, backgroundColor: color.rojoSuave, borderRadius: 12, padding: 12 },
  alertaTexto: { flex: 1, color: color.rojo, fontWeight: '600', fontSize: 13 },
  item: { backgroundColor: color.tarjeta, borderRadius: 14, padding: 14, gap: 10 },
  itemTexto: { fontWeight: '700', color: color.texto },
  auto: { color: color.verde, fontWeight: '600', fontSize: 13 },
  estados: { flexDirection: 'row', gap: 8 },
  estado: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: color.borde,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  estadoTexto: { fontWeight: '700', color: color.texto, fontSize: 13 },
  input: { borderWidth: 1, borderColor: color.borde, borderRadius: 10, padding: 10 },
  boton: { backgroundColor: color.primario, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  botonOff: { opacity: 0.45 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
