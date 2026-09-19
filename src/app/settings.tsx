import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth, useClerk, useUser } from '@clerk/expo';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import * as Linking from 'expo-linking';

import { AppShell } from '@/components/app-shell';
import { FontFamily } from '@/constants/theme';
import { api } from '../../convex/_generated/api';

type IconName = React.ComponentProps<typeof FontAwesome>['name'];

export default function SettingsScreen() {
  const { user } = useUser();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const profile = useQuery(api.users.getCurrent, isSignedIn ? {} : 'skip');
  const connection = useQuery(api.github.getConnection, isSignedIn ? {} : 'skip');
  const savePreferences = useMutation(api.users.setPreferences);
  const startGitHub = useAction(api.github.start);
  const darkMode = profile?.theme !== 'light';
  const notificationsEnabled = profile?.notificationsEnabled ?? true;

  const logout = async () => {
    await signOut();
    router.replace('/welcome');
  };

  const updatePreference = async (preferences: { theme?: 'dark' | 'light'; notificationsEnabled?: boolean }) => {
    try {
      await savePreferences(preferences);
    } catch {
      Alert.alert('Could not save settings', 'Check your connection and try again.');
    }
  };

  const unavailable = (name: string) => Alert.alert(`${name} isn't available yet`, 'This action will be added once the data and support services are connected.');
  const manageGitHub = async () => {
    if (connection?.state === 'connected') {
      Alert.alert('GitHub is connected', 'Your repositories are available when you add or edit a project.');
      return;
    }
    try {
      await Linking.openURL(await startGitHub());
    } catch (error) {
      Alert.alert('Could not connect GitHub', error instanceof Error ? error.message : 'Please try again.');
    }
  };
  const connected = connection?.state === 'connected';
  const connectionLabel = connection === undefined ? 'Checking…' : connected ? 'Connected' : connection?.state === 'reauthorizationRequired' ? 'Reconnect required' : 'Not connected';
  const accountName = user?.fullName || user?.firstName || 'DevTask member';
  const email = user?.primaryEmailAddress?.emailAddress;

  return <AppShell title="Settings">
    <View style={styles.profile}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{user?.firstName?.[0]?.toUpperCase() || 'P'}</Text></View>
      <View style={styles.profileCopy}><Text numberOfLines={1} style={styles.name}>{accountName}</Text><Text numberOfLines={1} style={styles.role}>{email || 'Signed in with Clerk'}</Text><Text style={styles.online}>● Account active</Text></View>
    </View>

    <Group title="Account">
      <SettingsRow icon="user-o" label="Personal Information" value="Managed by Clerk" onPress={() => unavailable('Account editing')} />
      <SettingsRow icon="lock" label="Change Password" value="Managed by Clerk" onPress={() => unavailable('Password management')} last />
    </Group>
    <Group title="GitHub">
      <SettingsRow icon="github" label="GitHub connection" value={connectionLabel} onPress={() => void manageGitHub()} last status={connected ? 'positive' : connection?.state === 'reauthorizationRequired' ? 'warning' : undefined} />
    </Group>
    <Group title="Preferences">
      <SettingsRow icon="moon-o" label="Dark Mode" trailing={<Switch accessibilityLabel="Dark Mode" disabled={profile === undefined} onValueChange={(value) => void updatePreference({ theme: value ? 'dark' : 'light' })} thumbColor="#E7F5FF" trackColor={{ false: '#34516E', true: '#087FFF' }} value={darkMode} />} />
      <SettingsRow icon="bell-o" label="Daily nudges" trailing={<Switch accessibilityLabel="Daily nudges" disabled={profile === undefined} onValueChange={(value) => void updatePreference({ notificationsEnabled: value })} thumbColor="#E7F5FF" trackColor={{ false: '#34516E', true: '#087FFF' }} value={notificationsEnabled} />} />
      <SettingsRow icon="clock-o" label="Nudge time" value={profile?.reminderTime || 'Not set'} onPress={() => router.push('/onboarding')} last />
    </Group>
    <Group title="Data">
      <SettingsRow icon="download" label="Export Data" onPress={() => unavailable('Data export')} />
      <SettingsRow icon="trash-o" label="Clear app data" onPress={() => unavailable('Clear app data')} last />
    </Group>
    <Group title="Support">
      <SettingsRow icon="question-circle-o" label="Help Center" onPress={() => unavailable('Help Center')} />
      <SettingsRow icon="envelope-o" label="Contact Us" onPress={() => unavailable('Contact support')} last />
    </Group>

    <Pressable accessibilityRole="button" onPress={logout} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}><Text style={styles.logoutText}>Sign out</Text></Pressable>
  </AppShell>;
}

function Group({ children, title }: { children: React.ReactNode; title: string }) {
  return <View style={styles.groupWrap}><Text style={styles.groupTitle}>{title}</Text><View style={styles.group}>{children}</View></View>;
}

function SettingsRow({ icon, label, value, trailing, last = false, onPress, status }: { icon: IconName; label: string; value?: string; trailing?: React.ReactNode; last?: boolean; onPress?: () => void; status?: 'positive' | 'warning' }) {
  return <Pressable accessibilityRole="button" disabled={!onPress && !trailing} onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && onPress && styles.rowPressed]}>
    <View style={styles.iconWrap}><FontAwesome color="#88C7FF" name={icon} size={11} /></View><Text style={styles.rowLabel}>{label}</Text>
    {trailing || <>{value ? <Text style={[styles.rowValue, status === 'positive' && styles.positive, status === 'warning' && styles.warning]}>{value}</Text> : null}{onPress ? <FontAwesome color="#78A7D4" name="chevron-right" size={9} /> : null}</>}
  </Pressable>;
}

const styles = StyleSheet.create({
  profile: { minHeight: 65, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 9, borderWidth: 1, borderColor: '#0B5BA2', backgroundColor: '#062549' },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#A8D9FF', backgroundColor: '#0A4E8A' }, avatarText: { color: '#FFF', fontFamily: FontFamily.bold, fontSize: 17 }, profileCopy: { flex: 1, minWidth: 0 }, name: { color: '#F2F8FF', fontFamily: FontFamily.semibold, fontSize: 11 }, role: { marginTop: 1, color: '#86AED8', fontFamily: FontFamily.regular, fontSize: 8 }, online: { marginTop: 3, color: '#00DDBE', fontFamily: FontFamily.medium, fontSize: 7 },
  groupWrap: { marginTop: 12 }, groupTitle: { marginBottom: 5, color: '#B7D9F8', fontFamily: FontFamily.semibold, fontSize: 10 }, group: { overflow: 'hidden', borderRadius: 8, borderWidth: 1, borderColor: '#0A5A9E', backgroundColor: '#062549' }, row: { minHeight: 34, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 7 }, rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#164675' }, iconWrap: { width: 17, height: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#176CB5', backgroundColor: '#092D56' }, rowLabel: { flex: 1, color: '#E5F2FF', fontFamily: FontFamily.regular, fontSize: 9 }, rowValue: { marginRight: 2, color: '#86C5FF', fontFamily: FontFamily.medium, fontSize: 8 }, positive: { color: '#00DDBE' }, warning: { color: '#FFC343' },
  logout: { marginTop: 18, marginBottom: 8, alignItems: 'center', paddingVertical: 10, borderRadius: 9, borderWidth: 1, borderColor: '#8C3641', backgroundColor: '#1C1623' }, logoutText: { color: '#FF939B', fontFamily: FontFamily.semibold, fontSize: 10 }, pressed: { opacity: 0.78 }, rowPressed: { backgroundColor: '#0A315E' },
});
