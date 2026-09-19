import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth, useClerk, useUser } from '@clerk/expo';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import * as Linking from 'expo-linking';

import { AppShell } from '@/components/app-shell';
import { Border, FontFamily, Palette, Radius, Spacing, Typography } from '@/constants/theme';
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
  const disconnectGitHub = useMutation(api.github.disconnect);
  const clearData = useMutation(api.users.clearData);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const exportSummary = useQuery(api.users.exportSummary, isSignedIn ? {} : 'skip');
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
      Alert.alert('GitHub is connected', 'Disconnecting removes the stored GitHub token and unlinks repository metadata from your projects.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => void disconnectGitHub() },
      ]);
      return;
    }
    try {
      await Linking.openURL(await startGitHub());
    } catch (error) {
      Alert.alert('Could not connect GitHub', error instanceof Error ? error.message : 'Please try again.');
    }
  };
  const exportData = async () => {
    if (!exportSummary) {
      Alert.alert('Export is not ready', 'Your data is still loading. Please try again in a moment.');
      return;
    }
    try {
      await Share.share({ title: 'DevTask data export', message: JSON.stringify(exportSummary, null, 2) });
    } catch (error) {
      Alert.alert('Could not export data', error instanceof Error ? error.message : 'Please try again.');
    }
  };
  const clearAppData = () => Alert.alert('Clear app data?', 'This removes your projects, features, checklists, notifications, and GitHub metadata from DevTask. Your Clerk account remains.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear data', style: 'destructive', onPress: async () => { try { await clearData(); router.replace('/onboarding'); } catch (error) { Alert.alert('Could not clear data', error instanceof Error ? error.message : 'Please try again.'); } } },
  ]);
  const removeAccount = () => Alert.alert('Delete account permanently?', 'This removes your DevTask profile, projects, features, checklist items, notifications, devices, and GitHub connection. Your Clerk account is not deleted from Clerk.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete account', style: 'destructive', onPress: async () => { try { await deleteAccount(); await signOut(); router.replace('/welcome'); } catch (error) { Alert.alert('Could not delete account', error instanceof Error ? error.message : 'Please try again.'); } } },
  ]);
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
      <SettingsRow icon="moon-o" label="Dark Mode" trailing={<Switch accessibilityLabel="Dark Mode" disabled={profile === undefined} onValueChange={(value) => void updatePreference({ theme: value ? 'dark' : 'light' })} thumbColor="#E7F5FF" trackColor={{ false: '#34516E', true: Palette.sky }} value={darkMode} />} />
      <SettingsRow icon="bell-o" label="Daily nudges" trailing={<Switch accessibilityLabel="Daily nudges" disabled={profile === undefined} onValueChange={(value) => void updatePreference({ notificationsEnabled: value })} thumbColor="#E7F5FF" trackColor={{ false: '#34516E', true: Palette.sky }} value={notificationsEnabled} />} />
      <SettingsRow icon="clock-o" label="Nudge time" value={profile?.reminderTime || 'Not set'} onPress={() => router.push('/onboarding')} last />
    </Group>
    <Group title="Data">
      <SettingsRow icon="download" label="Export data" value={exportSummary === undefined ? 'Loading…' : 'Ready'} onPress={() => void exportData()} />
      <SettingsRow icon="trash-o" label="Clear app data" onPress={clearAppData} last />
    </Group>
    <Group title="Account access">
      <SettingsRow icon="exclamation-triangle" label="Delete DevTask data" value="Permanent" onPress={removeAccount} last status="warning" />
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
    <View style={styles.iconWrap}><FontAwesome color={Palette.cyan} name={icon} size={14} /></View><Text style={styles.rowLabel}>{label}</Text>
    {trailing || <>{value ? <Text style={[styles.rowValue, status === 'positive' && styles.positive, status === 'warning' && styles.warning]}>{value}</Text> : null}{onPress ? <FontAwesome color={Palette.muted} name="chevron-right" size={11} /> : null}</>}
  </Pressable>;
}

const styles = StyleSheet.create({
  profile: { minHeight: 82, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderRadius: Radius.medium, borderWidth: Border.default, borderColor: '#006DD1', backgroundColor: Palette.surface },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Palette.cyan, backgroundColor: '#073B7B' },
  avatarText: { color: Palette.white, fontFamily: FontFamily.bold, fontSize: 19 },
  profileCopy: { flex: 1, minWidth: 0, gap: 2 }, name: { ...Typography.h4, color: Palette.white }, role: { ...Typography.small, color: Palette.muted }, online: { ...Typography.small, color: Palette.mint },
  groupWrap: { marginTop: Spacing.five }, groupTitle: { ...Typography.small, marginBottom: Spacing.two, color: Palette.muted, textTransform: 'uppercase', letterSpacing: 0.7 }, group: { overflow: 'hidden', borderRadius: Radius.medium, borderWidth: Border.default, borderColor: Palette.border, backgroundColor: Palette.surface },
  row: { minHeight: 58, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three }, rowDivider: { borderBottomWidth: Border.hairline, borderBottomColor: Palette.border }, iconWrap: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.small, borderWidth: Border.default, borderColor: '#006DD1', backgroundColor: Palette.backgroundDeep }, rowLabel: { flex: 1, ...Typography.caption, color: Palette.white }, rowValue: { marginRight: Spacing.one, ...Typography.small, color: '#86C5FF' }, positive: { color: Palette.mint }, warning: { color: Palette.amber },
  logout: { marginTop: Spacing.six, marginBottom: Spacing.two, alignItems: 'center', paddingVertical: Spacing.three, borderRadius: Radius.medium, borderWidth: Border.default, borderColor: '#8C3641', backgroundColor: '#1C1623' }, logoutText: { ...Typography.caption, color: '#FF939B', fontFamily: FontFamily.semibold }, pressed: { opacity: 0.78 }, rowPressed: { backgroundColor: '#0A315E' },
});
