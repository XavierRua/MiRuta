import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { color } from '../theme/colors';

// Medidor circular tipo velocímetro (arco de 270°).
// fraccion: 0 a 1 (cuánto se llena el arco) · colorArco: color según el resultado
export default function Medidor({ fraccion, colorArco, valor, unidad, tam = 84, grosor = 9 }) {
  const r = (tam - grosor) / 2;
  const c = tam / 2;
  const circ = 2 * Math.PI * r;
  const arco = circ * 0.75; // 270°
  const lleno = arco * Math.max(0, Math.min(1, fraccion ?? 0));

  return (
    <View style={{ width: tam, height: tam }}>
      <Svg width={tam} height={tam}>
        {/* Gira 135° para que el arco abra hacia abajo, como un velocímetro */}
        <G rotation={135} origin={`${c}, ${c}`}>
          <Circle
            cx={c}
            cy={c}
            r={r}
            stroke="#eef2f7"
            strokeWidth={grosor}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${arco} ${circ}`}
          />
          {lleno > 0 && (
            <Circle
              cx={c}
              cy={c}
              r={r}
              stroke={colorArco}
              strokeWidth={grosor}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${lleno} ${circ}`}
            />
          )}
        </G>
      </Svg>
      <View style={s.centro} pointerEvents="none">
        <Text style={[s.valor, { color: colorArco }]} numberOfLines={1} adjustsFontSizeToFit>
          {valor}
        </Text>
        {unidad ? <Text style={s.unidad}>{unidad}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  centro: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  valor: { fontSize: 20, fontWeight: '800' },
  unidad: { fontSize: 11, color: color.suave, marginTop: -2 },
});
