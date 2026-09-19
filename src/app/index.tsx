import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, OnboardingPagination } from '@/components/ui/devtask-ui';
import { FontFamily, Palette } from '@/constants/theme';

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
          <OnboardingPagination step={1} />
          <AppButton icon={<Text style={styles.buttonArrow}>→</Text>} label="Get Started" />
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
    color: Palette.white,
    fontSize: 37,
    lineHeight: 42,
    fontFamily: FontFamily.extraBold,
    letterSpacing: -1.3,
  },
  description: {
    marginTop: 18,
    color: Palette.muted,
    fontSize: 16,
    lineHeight: 23,
    fontFamily: FontFamily.regular,
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
    fontFamily: FontFamily.medium,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 18,
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 24,
    fontFamily: FontFamily.regular,
  },
});
