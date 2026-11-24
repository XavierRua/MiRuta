import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme/colors';
import { formatoFecha } from '../utils/fechas';

// Campo que muestra una fecha y abre el calendario al tocarlo.
// Android: usa el calendario nativo en ventana emergente.
// iPhone: muestra el calendario dentro de una hoja inferior con botón "Listo".
export default function CampoFecha({ etiqueta, valor, onCambiar, minima, maxima, error }) {
  const [abiertoIOS, setAbiertoIOS] = useState(false);
  const [temporal, setTemporal] = useState(valor);

  const abrir = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: valor,
        mode: 'date',
        minimumDate: minima,
        maximumDate: maxima,
        onChange: (evento, fecha) => {
          if (evento.type === 'set' && fecha) onCambiar(fecha);
        },
      });
    } else {
      setTemporal(valor);
      setAbiertoIOS(true);
    }
  };

  return (
    <View style={s.contenedor}>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      <Pressable style={[s.campo, error && s.campoError]} onPress={abrir}>
        <Ionicons name="calendar-outline" size={18} color={color.primario} />
        <Text style={s.valor}>{formatoFecha(valor)}</Text>
      </Pressable>

      {Platform.OS === 'ios' && (
        <Modal visible={abiertoIOS} transparent animationType="slide" onRequestClose={() => setAbiertoIOS(false)}>
          <Pressable style={s.fondoModal} onPress={() => setAbiertoIOS(false)} />
          <View style={s.hoja}>
            <View style={s.hojaCab}>
              <Pressable onPress={() => setAbiertoIOS(false)}>
                <Text style={s.cancelar}>Cancelar</Text>
              </Pressable>
              <Text style={s.hojaTitulo}>{etiqueta}</Text>
              <Pressable
                onPress={() => {
                  onCambiar(temporal);
                  setAbiertoIOS(false);
                }}
              >
                <Text style={s.listo}>Listo</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={temporal}
              mode="date"
              display="inline"
              locale="es-CO"
              minimumDate={minima}
              maximumDate={maxima}
              themeVariant="light"
              accentColor={color.primario}
              onChange={(_, fecha) => fecha && setTemporal(fecha)}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  contenedor: { flex: 1, gap: 6 },
  etiqueta: { fontSize: 13, fontWeight: '600', color: color.suave },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: color.tarjeta,
    borderWidth: 1,
    borderColor: color.borde,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  campoError: { borderColor: color.rojo },
  valor: { fontSize: 15, fontWeight: '700', color: color.texto },
  fondoModal: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)' },
  hoja: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 },
  hojaCab: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: color.borde,
  },
  hojaTitulo: { fontWeight: '700', fontSize: 16, color: color.texto },
  cancelar: { color: color.suave, fontSize: 16 },
  listo: { color: color.primario, fontSize: 16, fontWeight: '700' },
});