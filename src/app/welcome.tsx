import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, OnboardingPagination } from '@/components/ui/devtask-ui';
import { FontFamily, Palette } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.hero}>
          <View accessibilityLabel="GitHub" style={styles.githubMark}>
            <FontAwesome color="#7190BA" name="github" size={25} />
          </View>
          <Image contentFit="contain" source={require('@/assets/onboarding/welcome.png')} style={styles.illustration} />
        </View>
        <View style={styles.copySection}>
          <Text style={styles.title}>Finish what{`\n`}you start.</Text>
          <Text style={styles.description}>DevTask tracks your projects,{`\n`}syncs with GitHub, and pushes{`\n`}you to ship.</Text>
          <View style={styles.promise}><Text style={styles.promiseIcon}>🚀</Text><Text style={styles.promiseText}>Start less. Finish more.</Text></View>
        </View>
        <View style={styles.footer}><AppButton icon={<Text style={styles.buttonArrow}>→</Text>} label="Get Started" onPress={() => router.push('/sign-in')} /><OnboardingPagination step={1} total={3} /></View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#030B18' }, safeArea: { flex: 1, justifyContent: 'space-between' }, hero: { height: '39%', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 38 }, githubMark: { position: 'absolute', top: 38, left: 34, zIndex: 1 }, illustration: { width: '112%', height: '100%', transform: [{ translateY: 26 }] }, copySection: { paddingHorizontal: 34, marginTop: -2 }, title: { color: Palette.white, fontSize: 37, lineHeight: 42, fontFamily: FontFamily.extraBold, letterSpacing: -1.3 }, description: { marginTop: 18, color: Palette.muted, fontSize: 16, lineHeight: 23, fontFamily: FontFamily.regular }, promise: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 20, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999, backgroundColor: '#0D274E', borderWidth: StyleSheet.hairlineWidth, borderColor: '#1C4E89' }, promiseIcon: { fontSize: 15 }, promiseText: { color: '#DFEBFF', fontSize: 14, fontFamily: FontFamily.medium }, footer: { gap: 20, paddingHorizontal: 20, paddingBottom: 20 }, buttonArrow: { color: '#FFFFFF', fontSize: 22, lineHeight: 24, fontFamily: FontFamily.regular },
});
