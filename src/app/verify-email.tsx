import { isClerkAPIResponseError } from '@clerk/expo';
import { useSignUp } from '@clerk/expo/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamily, Palette } from '@/constants/theme';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { isLoaded, setActive, signUp } = useSignUp();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const verify = async () => {
    if (!isLoaded) return;
    setError(null); setSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status !== 'complete') { setError('Enter the verification code sent to your email.'); return; }
      await setActive({ session: result.createdSessionId });
      router.replace('/onboarding');
    } catch (caughtError) { setError(isClerkAPIResponseError(caughtError) ? caughtError.errors[0]?.longMessage ?? 'That code is not valid.' : 'Unable to verify your email right now.'); } finally { setSubmitting(false); }
  };
  return <View style={styles.screen}><SafeAreaView style={styles.safe}><View style={styles.content}><Text style={styles.eyebrow}>VERIFY YOUR EMAIL</Text><Text style={styles.title}>One last{`\n`}<Text style={styles.accent}>step.</Text></Text><Text style={styles.copy}>We sent a verification code to{`\n`}{email || 'your email address'}.</Text><TextInput accessibilityLabel="Email verification code" autoComplete="one-time-code" autoFocus keyboardType="number-pad" maxLength={6} onChangeText={setCode} placeholder="000000" placeholderTextColor="#567BA7" selectionColor={Palette.cyan} style={styles.input} value={code} /><Pressable accessibilityRole="button" disabled={submitting} onPress={verify} style={({ pressed }) => [styles.button, (pressed || submitting) && styles.pressed]}><Text style={styles.buttonText}>{submitting ? 'Verifying…' : 'Verify email →'}</Text></Pressable>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}<Pressable accessibilityRole="button" onPress={() => router.replace('/sign-up')}><Text style={styles.back}>Use a different email</Text></Pressable></View></SafeAreaView></View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#020914' }, safe: { flex: 1 }, content: { flex: 1, paddingHorizontal: 28, paddingTop: 115 }, eyebrow: { color: '#00BDFF', fontFamily: FontFamily.semibold, fontSize: 12, letterSpacing: 1.2 }, title: { marginTop: 12, color: '#F7FAFF', fontFamily: FontFamily.extraBold, fontSize: 38, lineHeight: 45, letterSpacing: -1.2 }, accent: { color: Palette.cyan }, copy: { marginTop: 17, color: '#B1D2FF', fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 23 }, input: { height: 66, marginTop: 34, borderWidth: 1, borderColor: '#007BDC', borderRadius: 16, color: '#FFF', textAlign: 'center', fontFamily: FontFamily.mono, fontSize: 26, letterSpacing: 8, backgroundColor: 'rgba(3, 40, 86, .58)' }, button: { height: 54, marginTop: 20, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0878FF', shadowColor: '#00BBFF', shadowOpacity: .4, shadowRadius: 14, elevation: 8 }, buttonText: { color: '#FFF', fontFamily: FontFamily.semibold, fontSize: 17 }, error: { marginTop: 14, color: '#FF9B9B', fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 }, back: { marginTop: 26, color: '#00BDFF', textAlign: 'center', fontFamily: FontFamily.semibold, fontSize: 14 }, pressed: { opacity: .78, transform: [{ scale: .99 }] } });
