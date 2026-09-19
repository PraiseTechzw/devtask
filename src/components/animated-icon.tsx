import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const SPLASH_DURATION = 1400;

/** Matches the branded loading handoff after the native launch screen. */
export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 1050 });
    const timer = setTimeout(() => setVisible(false), SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.max(progress.value * 100, 8)}%`,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(120)}
      exiting={FadeOut.duration(300)}
      onLayout={() => void SplashScreen.hideAsync()}
      style={styles.overlay}>
      <View style={styles.content}>
        <View style={styles.brand}>
          <View style={styles.iconGlow} />
          <Image source={require('@/assets/images/icon.png')} style={styles.icon} />
          <Text style={styles.name}>DevTask</Text>
          <Text style={styles.tagline}>Build. Finish. Grow.</Text>
        </View>

        <View style={styles.loading}>
          <Text style={styles.loadingLabel}>Loading your productivity...</Text>
          <View style={styles.track}>
            <Animated.View style={[styles.progress, progressStyle]} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: '#030B18',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: '44%',
    paddingBottom: '24%',
  },
  brand: {
    alignItems: 'center',
  },
  iconGlow: {
    position: 'absolute',
    top: -36,
    width: 184,
    height: 184,
    borderRadius: 92,
    backgroundColor: '#007BFF',
    opacity: 0.18,
  },
  icon: {
    width: 118,
    height: 118,
  },
  name: {
    marginTop: 22,
    color: '#F7FAFF',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  tagline: {
    marginTop: 4,
    color: '#1FCEFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  loading: {
    width: '100%',
    alignItems: 'center',
  },
  loadingLabel: {
    marginBottom: 12,
    color: '#7CA9D9',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#16365E',
  },
  progress: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#168BFF',
  },
});
