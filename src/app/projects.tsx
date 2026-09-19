import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppShell } from '@/components/app-shell';
import { projects } from '@/constants/mock-data';
import { FontFamily, Palette } from '@/constants/theme';

const projectMeta = [
  ['Design & Development', '$2,400', '#00DDBE', 'Active'],
  ['UI/UX Design', '$1,250', '#00DDBE', 'Active'],
  ['Frontend Development', '$980', '#FF9B4A', 'In Progress'],
  ['Design & Branding', '$750', '#00DDBE', 'Active'],
  ['E-commerce', '$1,500', '#FF626C', 'On Hold'],
  ['Social Media', '$420', '#00DDBE', 'Active'],
  ['Blog Platform', '$860', '#FF9B4A', 'In Progress'],
] as const;

export default function ProjectsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const list = [...projects, { id: 'ecommerce', name: 'E-commerce', progress: 25, health: 'On Hold', detail: '2 days ago' }, { id: 'social', name: 'Social Media', progress: 68, health: 'Active', detail: 'Today' }, { id: 'blog', name: 'Blog Platform', progress: 55, health: 'In Progress', detail: 'Today' }];
  const visibleProjects = useMemo(() => list.filter((project) => { const meta = projectMeta[list.indexOf(project)]; const statusMatches = filter === 'All' || (filter === 'Active' ? meta[3] === 'Active' : filter === 'Completed' ? false : meta[3] === 'On Hold'); return statusMatches && project.name.toLowerCase().includes(query.trim().toLowerCase()); }), [filter, query]);
  return <AppShell title="Projects" action={<Pressable accessibilityLabel="Add project" onPress={() => router.push('/add-project')}><Text style={styles.add}>+</Text></Pressable>}>
    <View style={styles.search}><FontAwesome color="#8DB9E7" name="search" size={12} /><TextInput accessibilityLabel="Search projects" onChangeText={setQuery} placeholder="Search projects..." placeholderTextColor="#8DB9E7" style={styles.searchInput} value={query} /></View>
    <View style={styles.filters}>{['All', 'Active', 'Completed', 'On Hold'].map((item) => <Pressable accessibilityRole="button" key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.selected]}><Text style={[styles.filterText, filter === item && styles.selectedText]}>{item}</Text></Pressable>)}</View>
    <View>{visibleProjects.map((project) => { const index = list.indexOf(project); const meta = projectMeta[index]; return <Pressable accessibilityRole="button" key={project.id} onPress={() => router.push(`/project/${project.id}` as never)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}><ProgressRing color={meta[2]} value={project.progress} /><View style={styles.copy}><Text style={styles.name}>{project.name}</Text><Text style={styles.category}>{meta[0]}</Text><View style={styles.statusLine}><View style={[styles.dot, { backgroundColor: meta[2] }]} /><Text style={[styles.status, { color: meta[2] }]}>{meta[3]}</Text></View></View><View style={styles.budgetPill}><Text style={styles.budget}>{meta[1]}</Text></View><FontAwesome color="#6EA7DC" name="chevron-right" size={9} /></Pressable>; })}</View>
  </AppShell>;
}
function ProgressRing({ color, value }: { color: string; value: number }) { const size = 35; const stroke = 3; const radius = (size - stroke) / 2; const circumference = 2 * Math.PI * radius; return <View style={styles.ring}><Svg height={size} width={size}><Circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="#164A73" strokeWidth={stroke} /><Circle cx={size / 2} cy={size / 2} fill="none" r={radius} rotation="-90" stroke={color} strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - value / 100)} strokeLinecap="round" strokeWidth={stroke} origin={`${size / 2}, ${size / 2}`} /></Svg><Text style={styles.ringText}>{value}%</Text></View>; }
const styles = StyleSheet.create({ add: { color: Palette.cyan, fontFamily: FontFamily.regular, fontSize: 30 }, search: { height: 36, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#0A67B4', borderRadius: 9, backgroundColor: '#06274F' }, searchInput: { flex: 1, height: '100%', color: '#EFF7FF', fontFamily: FontFamily.regular, fontSize: 10 }, filters: { flexDirection: 'row', gap: 6, marginVertical: 10 }, filter: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 99, backgroundColor: '#0A2C55' }, selected: { backgroundColor: '#087FFF' }, filterText: { color: '#A9C9F1', fontFamily: FontFamily.medium, fontSize: 9 }, selectedText: { color: '#FFF' }, card: { minHeight: 58, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 7, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 11, borderWidth: 1, borderColor: '#0A5EA7', backgroundColor: '#062B55', shadowColor: '#00172E', shadowOpacity: .4, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 }, ring: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: '#062246', borderRadius: 18 }, ringText: { position: 'absolute', color: '#E1F4FF', fontFamily: FontFamily.mono, fontSize: 8 }, copy: { flex: 1 }, name: { color: '#EEF7FF', fontFamily: FontFamily.semibold, fontSize: 11 }, category: { marginTop: 2, color: '#82ADD9', fontFamily: FontFamily.regular, fontSize: 8 }, statusLine: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }, dot: { width: 5, height: 5, borderRadius: 3 }, status: { fontFamily: FontFamily.medium, fontSize: 8 }, budgetPill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 99, borderWidth: StyleSheet.hairlineWidth, borderColor: '#1B639D', backgroundColor: '#0A3B69' }, budget: { color: '#BCE2FF', fontFamily: FontFamily.medium, fontSize: 8 }, pressed: { opacity: .78, transform: [{ scale: .985 }] } });
