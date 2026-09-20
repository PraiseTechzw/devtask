import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { FontFamily } from '@/constants/theme';

function arcPath(cx: number, cy: number, r: number, progress: number) {
  const angle = (Math.max(0.5, progress) / 100) * 360;
  const start = (-90 * Math.PI) / 180;
  const end = ((-90 + angle) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const largeArc = angle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export function ProgressRing({
  color,
  value,
  size = 52,
  stroke = 5,
  caption,
}: {
  color: string;
  value: number;
  size?: number;
  stroke?: number;
  caption?: string;
}) {
  const progress = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const center = size / 2;
  const radius = (size - stroke) / 2;
  const valueSize = size > 120 ? 36 : size > 90 ? 26 : size > 60 ? 13 : 9;

  return (
    <View style={{ width: size, height: size }}>
      <Svg height={size} width={size}>
        <Circle
          cx={center}
          cy={center}
          fill="transparent"
          r={radius}
          stroke="#1B4F86"
          strokeWidth={stroke}
        />
        {progress >= 99.5 ? (
          <Circle cx={center} cy={center} fill="transparent" r={radius} stroke={color} strokeWidth={stroke} />
        ) : progress > 0 ? (
          <Path
            d={arcPath(center, center, radius, progress)}
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeWidth={stroke}
          />
        ) : null}
      </Svg>
      <View pointerEvents="none" style={styles.label}>
        <Text style={[styles.value, { fontSize: valueSize, lineHeight: valueSize + 4 }]}>{Math.round(progress)}%</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: '#F4F9FF',
    fontFamily: FontFamily.bold,
    textAlign: 'center',
  },
  caption: {
    marginTop: 2,
    color: '#9EC4EA',
    fontFamily: FontFamily.medium,
    fontSize: 13,
    textAlign: 'center',
  },
});
