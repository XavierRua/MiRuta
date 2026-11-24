import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { color } from '../theme/colors';
import { api } from '../services/api';

// Logo de la empresa del trabajador (lo sube el administrador en la web).
// Si la empresa no tiene logo, o no carga, se muestra el de MiRuta.
export default function LogoEmpresa({ alto = 30 }) {
  const empresa = api.getEmpresa();
  const [fallo, setFallo] = useState(false);

  if (empresa?.logoUrl && !fallo) {
    return (
      <Image
        source={{ uri: empresa.logoUrl }}
        style={{ height: alto, width: alto * 4.5 }}
        resizeMode="contain"
        accessibilityLabel={`Logo de ${empresa.nombre}`}
        onError={() => setFallo(true)}
      />
    );
  }
  return (
    <View style={s.fila} accessibilityLabel="MiRuta">
      <Text style={[s.punto, { fontSize: alto * 0.85 }]}>◉</Text>
      <Text style={[s.nombre, { fontSize: alto * 0.8 }]}>MiRuta</Text>
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  punto: { color: color.primario, fontWeight: '800' },
  nombre: { color: color.texto, fontWeight: '800', letterSpacing: -0.5 },
});
