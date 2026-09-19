import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.hero}>
          <Image
            contentFit="contain"
            source={require('@/assets/onboarding/welcome.png')}
            style={styles.illustration}
          />
        </View>

        <View style={styles.copySection}>
          <Text style={styles.title}>Finish what{`\n`}you start.</Text>
          <Text style={styles.description}>
            DevTask tracks your projects,{`\n`}syncs with GitHub, and pushes{`\n`}you to ship.
          </Text>

          <View style={styles.promise}>
            <Text style={styles.promiseIcon}>🚀</Text>
            <Text style={styles.promiseText}>Start less. Finish more.</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View accessibilityLabel="Onboarding step 1 of 4" style={styles.pagination}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>Get Started</Text>
            <Text style={styles.buttonArrow}>→</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#030B18',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  hero: {
    height: '42%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  illustration: {
    width: '112%',
    height: '100%',
  },
  copySection: {
    paddingHorizontal: 34,
    marginTop: -6,
  },
  title: {
    color: '#F7FAFF',
    fontSize: 37,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -1.3,
  },
  description: {
    marginTop: 18,
    color: '#B7CAE7',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '400',
  },
  promise: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0D274E',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1C4E89',
  },
  promiseIcon: {
    fontSize: 15,
  },
  promiseText: {
    color: '#DFEBFF',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 18,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 9,
    marginBottom: 23,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3A5A8A',
  },
  dotActive: {
    backgroundColor: '#168BFF',
  },
  button: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#167DFA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#168BFF',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '400',
  },
});
