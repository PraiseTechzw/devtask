import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppShell } from '@/components/app-shell';
import { api } from '../../convex/_generated/api';
import { FontFamily, Palette } from '@/constants/theme';

type ProjectStatus = 'Active' | 'In Progress' | 'On Hold';
type ProjectItem = {
  id: string;
  name: string;
  progress: number;
  health: string;
  detail: string;
  category: string;
  budget: string;
  status: ProjectStatus;
};

const filters = ['All', 'Active', 'Completed', 'On Hold'] as const;
type Filter = (typeof filters)[number];

function statusColor(status: ProjectStatus) {
  if (status === 'On Hold') return '#FF626C';
  return status === 'In Progress' ? '#FF9B4A' : '#00DDBE';
}

export default function ProjectsScreen() {
  const router = useRouter();
  const projects = useQuery(api.projects.list, {});
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const projectList: ProjectItem[] = (projects ?? []).map((project) => ({
    id: project._id, name: project.name, progress: project.progress, health: project.health, detail: project.lastActivityAt ? 'Updated recently' : 'No activity yet', category: project.repositoryName || 'Personal project', budget: project.focus ? 'Focus' : 'Project', status: project.state === 'completed' ? 'In Progress' : project.health === 'stalled' || project.health === 'dying' ? 'On Hold' : project.health === 'slowing' ? 'In Progress' : 'Active',
  }));
  const visibleProjects = useMemo(() => projectList.filter((project) => {
    const matchesFilter = filter === 'All' || (filter === 'Active' && project.status === 'Active') || (filter === 'On Hold' && project.status === 'On Hold');
    return matchesFilter && project.name.toLowerCase().includes(query.trim().toLowerCase());
  }), [filter, projectList, query]);

  return <AppShell title="Projects" action={<Pressable accessibilityLabel="Add project" onPress={() => router.push('/add-project')}><Text style={styles.add}>+</Text></Pressable>}>
    <View style={styles.search}><FontAwesome color="#8DB9E7" name="search" size={12} /><TextInput accessibilityLabel="Search projects" onChangeText={setQuery} placeholder="Search projects..." placeholderTextColor="#8DB9E7" style={styles.searchInput} value={query} /></View>
    <View style={styles.filters}>{filters.map((item) => <Pressable accessibilityRole="button" key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.selected]}><Text style={[styles.filterText, filter === item && styles.selectedText]}>{item}</Text></Pressable>)}</View>
    {visibleProjects.length ? visibleProjects.map((project) => {
      const color = statusColor(project.status);
      return <Pressable accessibilityRole="button" key={project.id} onPress={() => router.push(`/project/${project.id}` as never)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <ProgressRing color={color} value={project.progress} />
        <View style={styles.copy}><Text numberOfLines={1} style={styles.name}>{project.name}</Text><Text numberOfLines={1} style={styles.category}>{project.category}</Text><View style={styles.statusLine}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={[styles.status, { color }]}>{project.status}</Text></View></View>
        <View style={styles.budgetPill}><Text style={styles.budget}>{project.budget}</Text></View><FontAwesome color="#6EA7DC" name="chevron-right" size={9} />
      </Pressable>;
    }) : <View style={styles.empty}><Text style={styles.emptyTitle}>No projects found</Text><Text style={styles.emptyCopy}>Try another search or filter.</Text></View>}
  </AppShell>;
}

function ProgressRing({ color, value }: { color: string; value: number }) {
  const size = 36;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return <View style={styles.ring}><Svg height={size} width={size}><Circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="#164A73" strokeWidth={stroke} /><Circle cx={size / 2} cy={size / 2} fill="none" origin={`${size / 2}, ${size / 2}`} r={radius} rotation="-90" stroke={color} strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - value / 100)} strokeLinecap="round" strokeWidth={stroke} /></Svg><Text style={styles.ringText}>{value}%</Text></View>;
}

const styles = StyleSheet.create({
  add: { color: Palette.cyan, fontFamily: FontFamily.regular, fontSize: 30 },
  search: { height: 36, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#0A67B4', borderRadius: 9, backgroundColor: '#06274F' }, searchInput: { flex: 1, height: '100%', color: '#EFF7FF', fontFamily: FontFamily.regular, fontSize: 10 },
  filters: { flexDirection: 'row', gap: 6, marginVertical: 10 }, filter: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 99, backgroundColor: '#0A2C55' }, selected: { backgroundColor: '#087FFF' }, filterText: { color: '#A9C9F1', fontFamily: FontFamily.medium, fontSize: 9 }, selectedText: { color: '#FFF' },
  card: { minHeight: 61, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 11, borderWidth: 1, borderColor: '#0A5EA7', backgroundColor: '#062B55', shadowColor: '#00172E', shadowOpacity: .4, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  ring: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#062246' }, ringText: { position: 'absolute', color: '#E1F4FF', fontFamily: FontFamily.mono, fontSize: 8 }, copy: { flex: 1, minWidth: 0 }, name: { color: '#EEF7FF', fontFamily: FontFamily.semibold, fontSize: 11 }, category: { marginTop: 2, color: '#82ADD9', fontFamily: FontFamily.regular, fontSize: 8 }, statusLine: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }, dot: { width: 5, height: 5, borderRadius: 3 }, status: { fontFamily: FontFamily.medium, fontSize: 8 }, budgetPill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 99, borderWidth: StyleSheet.hairlineWidth, borderColor: '#1B639D', backgroundColor: '#0A3B69' }, budget: { color: '#BCE2FF', fontFamily: FontFamily.medium, fontSize: 8 }, pressed: { opacity: .78, transform: [{ scale: .985 }] }, empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#0A5EA7', borderRadius: 12, backgroundColor: '#041E3D' }, emptyTitle: { color: '#EFF7FF', fontFamily: FontFamily.semibold, fontSize: 14 }, emptyCopy: { marginTop: 5, color: '#83ACD7', fontFamily: FontFamily.regular, fontSize: 10 },
});
