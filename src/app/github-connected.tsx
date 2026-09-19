import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@clerk/expo';
import { useAction, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { FontFamily, Palette, Radius, Spacing, Typography } from '@/constants/theme';

export default function GitHubConnectedScreen() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string; message?: string }>();
  const profile = useQuery(api.users.getCurrent, isSignedIn ? {} : 'skip');
  const connection = useQuery(api.github.getConnection, isSignedIn ? {} : 'skip');
  const startGitHub = useAction(api.github.start);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!isSignedIn || profile === undefined || params.status === 'error') return;
    if (params.status === 'success' && connection?.state === 'connected') return;
  }, [connection?.state, isSignedIn, params.status, profile]);

  if (!isSignedIn) return null;
  if (profile === undefined) return <ScreenMessage message="Checking your DevTask profile…" />;
  if (profile === null) return <ScreenMessage message="Create your DevTask profile before connecting GitHub." />;

  const completed = params.status === 'success' && connection?.state === 'connected';
  const retry = async () => {
    setConnecting(true);
    try {
      await Linking.openURL(await startGitHub());
    } finally {
      setConnecting(false);
    }
  };

  return <View style={styles.screen}><SafeAreaView style={styles.safe}><View style={styles.content}>
    <View style={[styles.icon, completed ? styles.iconSuccess : styles.iconError]}><FontAwesome color={completed ? Palette.mint : Palette.amber} name={completed ? 'check' : 'github'} size={30} /></View>
    <Text style={styles.title}>{completed ? 'GitHub connected' : 'GitHub connection needs attention'}</Text>
    <Text style={styles.copy}>{completed ? 'Your repositories are ready. Choose one when you create or edit a project.' : params.message || 'GitHub authorization did not finish. Your existing DevTask data is safe.'}</Text>
    {!completed ? <Pressable accessibilityRole="button" disabled={connecting} onPress={() => void retry()} style={styles.primary}><Text style={styles.primaryText}>{connecting ? 'Opening GitHub…' : 'Try again'}</Text></Pressable> : null}
    <Pressable accessibilityRole="button" onPress={() => router.replace(profile.onboardingStatus === 'complete' ? '/(app)/settings' : '/onboarding')} style={styles.secondary}><Text style={styles.secondaryText}>{completed ? 'Continue' : 'Continue without GitHub'}</Text></Pressable>
  </View></SafeAreaView></View>;
}

function ScreenMessage({ message }: { message: string }) {
  return <View style={styles.screen}><SafeAreaView style={styles.safe}><Text style={styles.loading}>{message}</Text></SafeAreaView></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background }, safe: { flex: 1 }, content: { flex: 1, padding: Spacing.six, alignItems: 'center', justifyContent: 'center' }, icon: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center', borderRadius: 39, borderWidth: 1 }, iconSuccess: { borderColor: Palette.mint, backgroundColor: '#073B6C' }, iconError: { borderColor: Palette.amber, backgroundColor: '#3B2C13' }, title: { ...Typography.h2, marginTop: Spacing.five, color: Palette.white, textAlign: 'center' }, copy: { ...Typography.body, maxWidth: 340, marginTop: Spacing.two, color: Palette.muted, textAlign: 'center' }, primary: { minWidth: 180, marginTop: Spacing.six, paddingHorizontal: Spacing.five, paddingVertical: Spacing.three, alignItems: 'center', borderRadius: Radius.pill, backgroundColor: Palette.blue }, primaryText: { ...Typography.caption, color: Palette.white, fontFamily: FontFamily.semibold }, secondary: { marginTop: Spacing.three, padding: Spacing.three }, secondaryText: { ...Typography.caption, color: Palette.cyan, fontFamily: FontFamily.semibold }, loading: { ...Typography.body, margin: Spacing.six, color: Palette.muted },
});
