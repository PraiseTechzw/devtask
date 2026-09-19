import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useClerk, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { FontFamily, Palette } from '@/constants/theme';

type IconName = React.ComponentProps<typeof FontAwesome>['name'];

export default function SettingsScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const logout = async () => {
    await signOut();
    router.replace('/welcome');
  };

  return <AppShell title="Settings">
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.profile, pressed && styles.pressed]}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{user?.firstName?.[0]?.toUpperCase() || 'P'}</Text></View>
      <View style={styles.profileCopy}><Text numberOfLines={1} style={styles.name}>{user?.fullName || 'Praise Masunga'}</Text><Text numberOfLines={1} style={styles.role}>Product Designer</Text><Text style={styles.online}>● Online · Focus</Text></View>
      <FontAwesome color="#83B5E4" name="chevron-right" size={11} />
    </Pressable>

    <Group title="Account">
      <SettingsRow icon="user-o" label="Personal Information" />
      <SettingsRow icon="lock" label="Change Password" last />
    </Group>
    <Group title="Preferences">
      <SettingsRow icon="moon-o" label="Dark Mode" trailing={<Switch accessibilityLabel="Dark Mode" onValueChange={setDarkMode} thumbColor="#E7F5FF" trackColor={{ false: '#34516E', true: '#087FFF' }} value={darkMode} />} />
      <SettingsRow icon="bell-o" label="Notifications" trailing={<Switch accessibilityLabel="Notifications" onValueChange={setNotifications} thumbColor="#E7F5FF" trackColor={{ false: '#34516E', true: '#087FFF' }} value={notifications} />} />
      <SettingsRow icon="language" label="Language" value="English" last />
    </Group>
    <Group title="Data">
      <SettingsRow icon="download" label="Export Data" />
      <SettingsRow icon="upload" label="Import Data" last />
    </Group>
    <Group title="Support">
      <SettingsRow icon="question-circle-o" label="Help Center" />
      <SettingsRow icon="envelope-o" label="Contact Us" last />
    </Group>

    <Pressable accessibilityRole="button" onPress={() => router.push('/empty-states')} style={styles.preview}><Text style={styles.previewText}>Preview empty states</Text><FontAwesome color={Palette.cyan} name="chevron-right" size={9} /></Pressable>
    <Pressable accessibilityRole="button" onPress={logout} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}><Text style={styles.logoutText}>Sign out</Text></Pressable>
  </AppShell>;
}

function Group({ children, title }: { children: React.ReactNode; title: string }) {
  return <View style={styles.groupWrap}><Text style={styles.groupTitle}>{title}</Text><View style={styles.group}>{children}</View></View>;
}

function SettingsRow({ icon, label, value, trailing, last = false }: { icon: IconName; label: string; value?: string; trailing?: React.ReactNode; last?: boolean }) {
  return <Pressable accessibilityRole="button" style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && styles.rowPressed]}>
    <View style={styles.iconWrap}><FontAwesome color="#88C7FF" name={icon} size={11} /></View><Text style={styles.rowLabel}>{label}</Text>
    {trailing || <>{value ? <Text style={styles.rowValue}>{value}</Text> : null}<FontAwesome color="#78A7D4" name="chevron-right" size={9} /></>}
  </Pressable>;
}

const styles = StyleSheet.create({
  profile: { minHeight: 65, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 9, borderWidth: 1, borderColor: '#0B5BA2', backgroundColor: '#062549' },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#A8D9FF', backgroundColor: '#0A4E8A' }, avatarText: { color: '#FFF', fontFamily: FontFamily.bold, fontSize: 17 }, profileCopy: { flex: 1, minWidth: 0 }, name: { color: '#F2F8FF', fontFamily: FontFamily.semibold, fontSize: 11 }, role: { marginTop: 1, color: '#86AED8', fontFamily: FontFamily.regular, fontSize: 8 }, online: { marginTop: 3, color: '#00DDBE', fontFamily: FontFamily.medium, fontSize: 7 },
  groupWrap: { marginTop: 12 }, groupTitle: { marginBottom: 5, color: '#B7D9F8', fontFamily: FontFamily.semibold, fontSize: 10 }, group: { overflow: 'hidden', borderRadius: 8, borderWidth: 1, borderColor: '#0A5A9E', backgroundColor: '#062549' }, row: { minHeight: 34, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 7 }, rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#164675' }, iconWrap: { width: 17, height: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#176CB5', backgroundColor: '#092D56' }, rowLabel: { flex: 1, color: '#E5F2FF', fontFamily: FontFamily.regular, fontSize: 9 }, rowValue: { marginRight: 2, color: '#86C5FF', fontFamily: FontFamily.medium, fontSize: 8 },
  preview: { marginTop: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 }, previewText: { color: Palette.cyan, fontFamily: FontFamily.medium, fontSize: 10 }, logout: { marginTop: 13, marginBottom: 8, alignItems: 'center', paddingVertical: 10, borderRadius: 9, borderWidth: 1, borderColor: '#8C3641', backgroundColor: '#1C1623' }, logoutText: { color: '#FF939B', fontFamily: FontFamily.semibold, fontSize: 10 }, pressed: { opacity: 0.78 }, rowPressed: { backgroundColor: '#0A315E' },
});
