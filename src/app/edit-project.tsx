import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { FontFamily, Palette } from '@/constants/theme';

export default function EditProjectScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useQuery(api.projects.get, id ? { projectId: id as never } : 'skip');
  const repositories = useQuery(api.github.listRepositories, {});
  const updateProject = useMutation(api.projects.update);
  const project = detail?.project;
  const [name, setName] = useState<string>();
  const [deadline, setDeadline] = useState<string>();
  const [repositoryId, setRepositoryId] = useState<string>();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentName = name ?? project?.name ?? '';
  const currentDeadline = deadline ?? project?.deadline ?? '';
  const currentRepositoryId = repositoryId ?? project?.repositoryId;
  const selectedRepository = useMemo(() => repositories?.find((item) => item.githubRepositoryId === currentRepositoryId), [currentRepositoryId, repositories]);
  if (detail === undefined) return <View style={styles.screen}><Text style={styles.loading}>Loading project…</Text></View>;
  if (!project) return <View style={styles.screen}><Text style={styles.loading}>Project not found.</Text></View>;
  const save = async () => {
    if (!currentName.trim()) { setError('Enter a project name.'); return; }
    setSaving(true); setError(null);
    try {
      await updateProject({ projectId: project._id, name: currentName, deadline: currentDeadline, repositoryId: selectedRepository?.githubRepositoryId ?? currentRepositoryId, repositoryName: selectedRepository?.fullName ?? project.repositoryName, repositoryUrl: selectedRepository?.url ?? project.repositoryUrl });
      router.back();
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : 'Unable to save project.'); } finally { setSaving(false); }
  };
  return <View style={styles.screen}><SafeAreaView style={styles.safe}><View style={styles.header}><Pressable accessibilityLabel="Go back" onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.title}>Edit Project</Text><View /></View><View style={styles.content}><Text style={styles.label}>Project name</Text><TextInput accessibilityLabel="Project name" onChangeText={setName} placeholderTextColor="#8FB5E6" style={styles.input} value={currentName} /><Text style={styles.label}>GitHub repository</Text><Pressable accessibilityRole="button" onPress={() => setOpen((value) => !value)} style={styles.select}><Text numberOfLines={1} style={selectedRepository ? styles.selected : styles.placeholder}>{selectedRepository?.fullName || project.repositoryName || 'No repository linked'}</Text><Text style={styles.chevron}>⌄</Text></Pressable>{open ? <>{repositories?.map((repository) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: repository.githubRepositoryId === currentRepositoryId }} key={repository._id} onPress={() => { setRepositoryId(repository.githubRepositoryId); setOpen(false); }} style={styles.repository}><Text style={styles.repositoryText}>{repository.fullName}</Text><Text style={styles.repositoryMeta}>{repository.visibility}</Text></Pressable>)}<Pressable onPress={() => { setRepositoryId(''); setOpen(false); }} style={styles.unlink}><Text style={styles.unlinkText}>Unlink repository</Text></Pressable></> : null}<Text style={styles.label}>Optional deadline</Text><TextInput accessibilityLabel="Optional deadline" onChangeText={setDeadline} placeholder="YYYY-MM-DD" placeholderTextColor="#8FB5E6" style={styles.input} value={currentDeadline} /><Text style={styles.helper}>Health uses the deadline only when it is within 14 days and progress is below 80%.</Text>{error ? <Text style={styles.error}>{error}</Text> : null}<Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={[styles.button, saving && styles.pressed]}><Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save changes'}</Text></Pressable></View></SafeAreaView></View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#020914' }, safe: { flex: 1 }, header: { height: 70, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { color: '#FFF', fontFamily: FontFamily.regular, fontSize: 41 }, title: { color: '#F5F8FF', fontFamily: FontFamily.bold, fontSize: 20 }, content: { paddingHorizontal: 22, paddingTop: 15 }, label: { marginTop: 20, marginBottom: 8, color: '#CDE5FF', fontFamily: FontFamily.medium, fontSize: 13 }, input: { height: 55, paddingHorizontal: 15, borderRadius: 13, borderWidth: 1, borderColor: '#0872C9', color: '#F5F9FF', fontFamily: FontFamily.regular, fontSize: 14, backgroundColor: '#052347' }, select: { height: 55, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 13, borderWidth: 1, borderColor: '#0872C9', backgroundColor: '#052347' }, placeholder: { flex: 1, color: '#8FB5E6', fontFamily: FontFamily.regular, fontSize: 13 }, selected: { flex: 1, color: '#F5F9FF', fontFamily: FontFamily.regular, fontSize: 13 }, chevron: { color: '#9FD0FC', fontSize: 18 }, repository: { minHeight: 43, paddingHorizontal: 14, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: StyleSheet.hairlineWidth, borderColor: '#1765A8', backgroundColor: '#062A54' }, repositoryText: { flex: 1, color: '#E7F4FF', fontFamily: FontFamily.medium, fontSize: 11 }, repositoryMeta: { color: '#75BFF0', fontFamily: FontFamily.regular, fontSize: 9 }, unlink: { padding: 12, backgroundColor: '#0B315B' }, unlinkText: { color: '#FFADB4', fontFamily: FontFamily.medium, fontSize: 10 }, helper: { marginTop: 8, color: '#7FA9D4', fontFamily: FontFamily.regular, fontSize: 10, lineHeight: 15 }, error: { marginTop: 10, color: '#FF9DA5', fontFamily: FontFamily.regular, fontSize: 12 }, button: { height: 54, marginTop: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: '#087FFF' }, buttonText: { color: '#FFF', fontFamily: FontFamily.semibold, fontSize: 16 }, loading: { margin: 24, color: '#A9CEEE', fontFamily: FontFamily.regular, fontSize: 13 }, pressed: { opacity: 0.7 },
});
