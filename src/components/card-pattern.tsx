import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Pattern, Rect } from 'react-native-svg';

export function CardPattern({ color = '#00D1FF', opacity = 0.12, ornaments = true }: { color?: string; opacity?: number; ornaments?: boolean }) {
  const patternId = `grid-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 360 200" width="100%">
        <Defs>
          <Pattern height="20" id={patternId} patternUnits="userSpaceOnUse" width="20">
            <Line stroke={color} strokeOpacity={opacity} strokeWidth="1" x1="0" x2="0" y1="0" y2="20" />
            <Line stroke={color} strokeOpacity={opacity} strokeWidth="1" x1="0" x2="20" y1="0" y2="0" />
          </Pattern>
        </Defs>
        <Rect fill={`url(#${patternId})`} height="200" width="360" />
        {ornaments ? (
          <G>
            <Line stroke={color} strokeOpacity={opacity * 0.9} strokeWidth="1" x1="40" x2="340" y1="24" y2="176" />
            <Line stroke={color} strokeOpacity={opacity * 0.55} strokeWidth="1" x1="0" x2="280" y1="150" y2="0" />
            <Circle cx="330" cy="18" fill={color} fillOpacity={opacity * 0.85} r="54" />
            <Circle cx="24" cy="188" fill={color} fillOpacity={opacity * 0.7} r="46" />
          </G>
        ) : null}
      </Svg>
    </View>
  );
}
