import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { CardPattern } from '@/components/card-pattern';
import { ProgressRing } from '@/components/progress-ring';
import { api } from '../../convex/_generated/api';
import { FontFamily, Palette, Radius } from '@/constants/theme';

const filters = ['All', 'Active', 'Slowing', 'Stalled', 'Dying', 'Completed'] as const;
type Filter = (typeof filters)[number];

function healthColor(health: string, completed = false) {
  if (completed) return Palette.cyan;
  if (health === 'dying') return Palette.red;
  if (health === 'stalled') return Palette.orange;
  if (health === 'slowing') return Palette.amber;
  return Palette.mint;
}

export default function ProjectsScreen() {
  const router = useRouter();
  const projects = useQuery(api.projects.list, {});
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const visibleProjects = useMemo(() => (projects ?? []).filter((project) => {
    if (project.state === 'archived') return false;
    const status = project.state === 'completed' ? 'Completed' : project.health[0].toUpperCase() + project.health.slice(1);
    const matchesFilter = filter === 'All' || (filter === 'Active' ? project.state === 'active' && project.health === 'active' : status === filter);
    return matchesFilter && project.name.toLowerCase().includes(query.trim().toLowerCase());
  }), [filter, projects, query]);

  return (
    <AppShell
      title="Projects"
      action={
        <Pressable accessibilityLabel="Add project" accessibilityRole="button" onPress={() => router.push('/add-project')} style={styles.addButton}>
          <Text style={styles.add}>+</Text>
        </Pressable>
      }>
      <View style={styles.search}>
        <FontAwesome color="#8DB9E7" name="search" size={15} />
        <TextInput accessibilityLabel="Search projects" onChangeText={setQuery} placeholder="Search projects..." placeholderTextColor="#8DB9E7" style={styles.searchInput} value={query} />
      </View>
      <ScrollView contentContainerStyle={styles.filters} horizontal showsHorizontalScrollIndicator={false}>
        {filters.map((item) => {
          const selected = filter === item;
          return (
            <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={item} onPress={() => setFilter(item)}>
              {selected ? (
                <LinearGradient colors={[Palette.sky, Palette.blue]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.filterSelected}>
                  <Text style={styles.selectedText}>{item}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.filter}><Text style={styles.filterText}>{item}</Text></View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      {visibleProjects.length ? visibleProjects.map((project) => {
        const completed = project.state === 'completed';
        const color = healthColor(project.health, completed);
        const status = completed ? 'Completed' : project.health[0].toUpperCase() + project.health.slice(1);
        return (
          <Pressable accessibilityRole="button" key={project._id} onPress={() => router.push(`/project/${project._id}` as never)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <LinearGradient colors={['#083868', '#06284F']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
            <CardPattern color={color} opacity={0.08} />
            <ProgressRing color={color} size={54} stroke={5} value={project.progress} />
            <View style={styles.copy}>
              <Text numberOfLines={1} style={styles.name}>{project.name}</Text>
              <Text numberOfLines={1} style={styles.category}>{project.repositoryName || 'Personal project'}{project.focus ? ' · Focus' : ''}</Text>
              <View style={styles.statusLine}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={[styles.status, { color }]}>{status}</Text>
              </View>
            </View>
            <Text style={[styles.percent, { color }]}>{project.progress}%</Text>
          </Pressable>
        );
      }) : (
        <View style={styles.empty}>
          <CardPattern color={Palette.cyan} opacity={0.12} />
          <Text style={styles.emptyTitle}>No projects found</Text>
          <Text style={styles.emptyCopy}>Try another search or filter, or add a project.</Text>
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  addButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: Palette.blue },
  add: { color: '#FFF', fontFamily: FontFamily.regular, fontSize: 28, lineHeight: 30 },
  search: { height: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#1A8CFF', borderRadius: Radius.pill, backgroundColor: '#06284F' },
  searchInput: { flex: 1, height: '100%', color: '#EFF7FF', fontFamily: FontFamily.regular, fontSize: 14 },
  filters: { flexDirection: 'row', gap: 8, marginVertical: 14, paddingRight: 8 },
  filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#1A5F9C', backgroundColor: '#0A2C55' },
  filterSelected: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  filterText: { color: '#A9C9F1', fontFamily: FontFamily.medium, fontSize: 13 },
  selectedText: { color: '#FFF', fontFamily: FontFamily.semibold, fontSize: 13 },
  card: { overflow: 'hidden', minHeight: 88, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: '#1A8CFF' },
  copy: { flex: 1, minWidth: 0 },
  name: { color: '#EEF7FF', fontFamily: FontFamily.semibold, fontSize: 16 },
  category: { marginTop: 3, color: '#82ADD9', fontFamily: FontFamily.regular, fontSize: 12 },
  statusLine: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  status: { fontFamily: FontFamily.medium, fontSize: 12, textTransform: 'capitalize' },
  percent: { fontFamily: FontFamily.bold, fontSize: 16 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  empty: { overflow: 'hidden', minHeight: 180, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1A8CFF', borderRadius: 16, backgroundColor: '#041E3D' },
  emptyTitle: { color: '#EFF7FF', fontFamily: FontFamily.semibold, fontSize: 16 },
  emptyCopy: { marginTop: 6, color: '#83ACD7', fontFamily: FontFamily.regular, fontSize: 13 },
});
