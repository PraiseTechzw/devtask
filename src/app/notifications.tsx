import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../../convex/_generated/api';
import { AppShell } from '@/components/app-shell';
import { FontFamily, Palette } from '@/constants/theme';

export default function NotificationsScreen() {
  const router = useRouter(); const notifications = useQuery(api.notifications.list, {}); const markRead = useMutation(api.notifications.markRead); const markAllRead = useMutation(api.notifications.markAllRead);
  return <AppShell title="Notifications" action={<Pressable accessibilityLabel="Mark all notifications read" onPress={() => void markAllRead()}><Text style={styles.allRead}>Mark all read</Text></Pressable>}>
    {notifications === undefined ? <Text style={styles.loading}>Loading notifications…</Text> : notifications.length ? notifications.map((item) => <Pressable key={item._id} accessibilityRole="button" onPress={async () => { await markRead({ notificationId: item._id }); if (item.deepLink) router.push(item.deepLink as never); }} style={[styles.card, !item.readAt && styles.unread]}><View style={styles.icon}><FontAwesome color={Palette.cyan} name={item.type === 'finishLine' ? 'flag-checkered' : item.type === 'healthChanged' ? 'exclamation-triangle' : 'bell'} size={13} /></View><View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.body}>{item.body}</Text></View>{!item.readAt ? <View style={styles.dot} /> : null}</Pressable>) : <View style={styles.empty}><FontAwesome color={Palette.cyan} name="bell-o" size={28} /><Text style={styles.emptyTitle}>You’re all caught up</Text><Text style={styles.emptyBody}>Finish a feature or check back after your next daily nudge.</Text></View>}
  </AppShell>;
}
const styles = StyleSheet.create({ allRead: { color: Palette.cyan, fontFamily: FontFamily.medium, fontSize: 10 }, loading: { color: '#9DC6EC', fontFamily: FontFamily.regular, fontSize: 12 }, card: { minHeight: 70, marginBottom: 8, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 11, borderWidth: 1, borderColor: '#125996', backgroundColor: '#05254A' }, unread: { borderColor: '#0786E6', backgroundColor: '#062D59' }, icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#063B6D' }, copy: { flex: 1 }, title: { color: '#EDF7FF', fontFamily: FontFamily.semibold, fontSize: 11 }, body: { marginTop: 3, color: '#9CC4E9', fontFamily: FontFamily.regular, fontSize: 9, lineHeight: 13 }, dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: Palette.cyan }, empty: { minHeight: 250, alignItems: 'center', justifyContent: 'center', padding: 28, borderWidth: 1, borderRadius: 12, borderColor: '#0A5D9F', backgroundColor: '#05274F' }, emptyTitle: { marginTop: 13, color: '#F0F8FF', fontFamily: FontFamily.semibold, fontSize: 15 }, emptyBody: { marginTop: 6, color: '#91B9E0', textAlign: 'center', fontFamily: FontFamily.regular, fontSize: 10, lineHeight: 15 } });
