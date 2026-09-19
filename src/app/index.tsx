import FontAwesome from '@expo/vector-icons/FontAwesome';
import { isClerkAPIResponseError } from '@clerk/expo';
import { useSignIn } from '@clerk/expo/legacy';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamily, Palette } from '@/constants/theme';

export function SignInScreen() {
  const router = useRouter();
  const { isLoaded, setActive, signIn } = useSignIn();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.create({ identifier: emailAddress.trim(), password });
      if (result.status !== 'complete') {
        setError('Complete the remaining sign-in step to continue.');
        return;
      }
      await setActive({ session: result.createdSessionId });
      router.replace('/onboarding');
    } catch (caughtError) {
      setError(isClerkAPIResponseError(caughtError) ? caughtError.errors[0]?.longMessage ?? 'Unable to sign in. Check your details and try again.' : 'Unable to sign in right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return <View style={styles.screen}>
    <LinearGradient colors={['#031A36', '#030E20', '#020914']} end={{ x: .72, y: 1 }} start={{ x: .1, y: 0 }} style={StyleSheet.absoluteFill} />
    <SafeAreaView style={styles.safeArea}>
      <ScrollView bounces={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brandArea}>
          <View style={styles.logoMark}><Text style={styles.logoCheck}>✓</Text><Text style={styles.logoPrompt}>›_</Text></View>
          <Text style={styles.brand}>Dev<Text style={styles.brandAccent}>Task</Text></Text>
          <Text style={styles.tagline}>Build. Finish. Grow.</Text>
          <Image accessibilityLabel="Developer workspace illustration" contentFit="contain" source={require('@/assets/sign-in.png')} style={styles.heroImage} />
        </View>
        <View style={styles.formArea}>
          <Text style={styles.title}>Welcome <Text style={styles.titleAccent}>Back</Text></Text>
          <Text style={styles.subtitle}>Sign in to continue your journey{`\n`}and achieve more.</Text>
          <Field autoComplete="email" icon="envelope-o" inputLabel="Email address" keyboardType="email-address" label="Email Address" onChangeText={setEmailAddress} placeholder="you@example.com" textContentType="emailAddress" value={emailAddress} />
          <Field autoComplete="password" icon="lock" inputLabel="Password" label="Password" onChangeText={setPassword} placeholder="Enter your password" secureTextEntry={!showPassword} textContentType="password" trailing={<Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} accessibilityRole="button" hitSlop={12} onPress={() => setShowPassword((visible) => !visible)} style={styles.visibilityButton}><FontAwesome color="#8FCAFF" name={showPassword ? 'eye-slash' : 'eye'} size={19} /></Pressable>} value={password} />
          <View style={styles.options}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: rememberMe }} onPress={() => setRememberMe((checked) => !checked)} style={styles.rememberControl}><View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>{rememberMe ? <Text style={styles.checkmark}>✓</Text> : null}</View><Text style={styles.rememberText}>Remember me</Text></Pressable>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/forgot-password')}><Text style={styles.link}>Forgot password?</Text></Pressable>
          </View>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting }} disabled={submitting} onPress={handleSignIn} style={({ pressed }) => [styles.signInButton, (pressed || submitting) && styles.pressed]}><LinearGradient colors={['#0878FF', '#0068FF', '#00D5F5']} end={{ x: 1, y: .5 }} start={{ x: 0, y: .5 }} style={styles.signInGradient}>{submitting ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.signInText}>Sign In</Text><Text style={styles.arrow}>→</Text></>}</LinearGradient></Pressable>
          <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.or}>or</Text><View style={styles.dividerLine} /></View>
          <SocialButton icon="google" label="Continue with Google" />
          <SocialButton icon="github" label="Continue with GitHub" />
          <Pressable accessibilityRole="button" onPress={() => router.push('/sign-up')}><Text style={styles.footer}>Don’t have an account? <Text style={styles.link}>Sign Up</Text></Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>;
}

export default function LaunchScreen() {
  return <Redirect href="/welcome" />;
}

function Field({ icon, label, inputLabel, trailing, ...inputProps }: { icon: 'envelope-o' | 'lock'; label: string; inputLabel: string; trailing?: ReactNode } & TextInputProps) {
  return <View style={styles.field}><FontAwesome color="#B7D7FF" name={icon} size={icon === 'lock' ? 24 : 20} style={styles.fieldIcon} /><View style={styles.fieldCopy}><Text style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={inputLabel} autoCapitalize="none" placeholderTextColor="#8FB5E6" selectionColor={Palette.cyan} style={styles.input} {...inputProps} /></View>{trailing}</View>;
}

function SocialButton({ icon, label }: { icon: 'github' | 'google'; label: string }) {
  return <Pressable accessibilityRole="button" style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}><FontAwesome color={icon === 'google' ? '#EA4335' : '#F8FAFC'} name={icon} size={25} /><Text style={styles.socialText}>{label}</Text><Text style={styles.socialArrow}>›</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020914' }, safeArea: { flex: 1 }, content: { flexGrow: 1, paddingBottom: 24 },
  brandArea: { height: 208, alignItems: 'center', overflow: 'hidden', paddingTop: 17 }, logoMark: { width: 64, height: 64, borderRadius: 18, borderWidth: 2, borderColor: '#04CFFF', backgroundColor: '#06295A', shadowColor: '#00CFFF', shadowOpacity: .72, shadowRadius: 13, shadowOffset: { width: 0, height: 0 }, elevation: 10, alignItems: 'center', justifyContent: 'center' }, logoCheck: { color: '#10D8FF', fontSize: 48, lineHeight: 51, fontFamily: FontFamily.extraBold, transform: [{ rotate: '-8deg' }] }, logoPrompt: { position: 'absolute', right: 9, bottom: 5, color: '#B9E8FF', fontSize: 13, fontFamily: FontFamily.mono }, brand: { marginTop: 8, color: '#F5F8FF', fontSize: 34, lineHeight: 38, letterSpacing: -1.2, fontFamily: FontFamily.extraBold }, brandAccent: { color: Palette.cyan }, tagline: { color: '#62B4FF', fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 20 }, heroImage: { position: 'absolute', right: -24, bottom: -42, width: 178, height: 178, opacity: .86 },
  formArea: { paddingHorizontal: 28 }, title: { color: '#F7FAFF', fontFamily: FontFamily.extraBold, fontSize: 35, lineHeight: 42, letterSpacing: -1.3 }, titleAccent: { color: Palette.cyan }, subtitle: { marginTop: 7, color: '#B1D2FF', fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 23 },
  field: { minHeight: 72, marginTop: 15, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#007BDC', backgroundColor: 'rgba(3, 40, 86, 0.58)' }, fieldIcon: { width: 31 }, fieldCopy: { flex: 1 }, fieldLabel: { color: '#B8D8FF', fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 17 }, input: { height: 31, padding: 0, color: '#EFF7FF', fontFamily: FontFamily.regular, fontSize: 16 }, visibilityButton: { paddingLeft: 10, paddingVertical: 12 },
  options: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }, rememberControl: { flexDirection: 'row', alignItems: 'center', gap: 10 }, checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 1, borderColor: '#4A91D8', alignItems: 'center', justifyContent: 'center' }, checkboxChecked: { borderColor: '#009DFF', backgroundColor: '#009DFF' }, checkmark: { color: '#FFF', fontFamily: FontFamily.extraBold, fontSize: 15, lineHeight: 17 }, rememberText: { color: '#D3E5FF', fontFamily: FontFamily.regular, fontSize: 14 }, link: { color: '#00BDFF', fontFamily: FontFamily.semibold, fontSize: 14 },
  error: { marginTop: 15, color: '#FF9B9B', fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 }, signInButton: { marginTop: 20, borderRadius: 27, shadowColor: '#00BBFF', shadowOpacity: .48, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 8 }, signInGradient: { height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }, signInText: { color: '#FFF', fontFamily: FontFamily.semibold, fontSize: 17 }, arrow: { color: '#FFF', fontFamily: FontFamily.regular, fontSize: 28, lineHeight: 30 }, divider: { flexDirection: 'row', alignItems: 'center', gap: 18, marginVertical: 18 }, dividerLine: { height: StyleSheet.hairlineWidth, flex: 1, backgroundColor: '#057BD9' }, or: { color: '#B9D8FF', fontFamily: FontFamily.regular, fontSize: 14 },
  socialButton: { height: 56, flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#007BD9', backgroundColor: 'rgba(3, 32, 69, 0.54)', paddingHorizontal: 23, marginBottom: 10 }, socialText: { flex: 1, marginLeft: 27, color: '#F4F8FF', fontFamily: FontFamily.medium, fontSize: 16 }, socialArrow: { color: '#C7E5FF', fontFamily: FontFamily.regular, fontSize: 32, lineHeight: 32 }, footer: { marginTop: 8, color: '#A9C9F3', textAlign: 'center', fontFamily: FontFamily.regular, fontSize: 14 }, pressed: { opacity: .78, transform: [{ scale: .99 }] },
});
