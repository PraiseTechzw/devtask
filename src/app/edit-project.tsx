import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { AppButton } from '@/components/ui/devtask-ui';
import { CardPattern } from '@/components/card-pattern';
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
  const selectedRepository = useMemo(() => repositories?.find((item: { githubRepositoryId: string }) => item.githubRepositoryId === currentRepositoryId), [currentRepositoryId, repositories]);

  if (detail === undefined) return <View style={styles.screen}><Text style={styles.loading}>Loading project…</Text></View>;
  if (!project) return <View style={styles.screen}><Text style={styles.loading}>Project not found.</Text></View>;

  const save = async () => {
    if (!currentName.trim()) { setError('Enter a project name.'); return; }
    setSaving(true);
    setError(null);
    try {
      await updateProject({
        projectId: project._id,
        name: currentName,
        deadline: currentDeadline,
        repositoryId: selectedRepository?.githubRepositoryId ?? currentRepositoryId,
        repositoryName: selectedRepository?.fullName ?? project.repositoryName,
        repositoryUrl: selectedRepository?.url ?? project.repositoryUrl,
      });
      router.back();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save project.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#04264A', '#021225', '#020914']} end={{ x: 0.8, y: 1 }} start={{ x: 0.1, y: 0 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.title}>Edit Project</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <CardPattern color={Palette.cyan} opacity={0.1} />
            <Text style={styles.label}>Project name <Text style={styles.required}>*</Text></Text>
            <TextInput accessibilityLabel="Project name" onChangeText={setName} placeholderTextColor="#8FB5E6" style={styles.input} value={currentName} />
            <Text style={styles.label}>GitHub repository</Text>
            <Pressable accessibilityRole="button" onPress={() => setOpen((value) => !value)} style={styles.select}>
              <Text numberOfLines={1} style={selectedRepository ? styles.selected : styles.placeholder}>{selectedRepository?.fullName || project.repositoryName || 'No repository linked'}</Text>
              <Text style={styles.chevron}>⌄</Text>
            </Pressable>
            {open ? (
              <>
                {repositories?.map((repository: { _id: string; githubRepositoryId: string; fullName: string; visibility: string }) => (
                  <Pressable accessibilityRole="radio" accessibilityState={{ selected: repository.githubRepositoryId === currentRepositoryId }} key={repository._id} onPress={() => { setRepositoryId(repository.githubRepositoryId); setOpen(false); }} style={styles.repository}>
                    <Text style={styles.repositoryText}>{repository.fullName}</Text>
                    <Text style={styles.repositoryMeta}>{repository.visibility}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => { setRepositoryId(''); setOpen(false); }} style={styles.unlink}><Text style={styles.unlinkText}>Unlink repository</Text></Pressable>
              </>
            ) : null}
            <Text style={styles.label}>Deadline</Text>
            <View style={styles.select}>
              <FontAwesome color="#8FB5E6" name="calendar-o" size={14} />
              <TextInput accessibilityLabel="Optional deadline" onChangeText={setDeadline} placeholder="YYYY-MM-DD" placeholderTextColor="#8FB5E6" style={styles.dateInput} value={currentDeadline} />
            </View>
            <Text style={styles.helper}>Health uses the deadline only when it is within 14 days and progress is below 80%.</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
          <AppButton disabled={saving} label={saving ? 'Saving…' : 'Save changes'} onPress={() => void save()} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#020914' },
  safe: { flex: 1 },
  header: { height: 70, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  back: { color: '#FFF', fontFamily: FontFamily.regular, fontSize: 36, lineHeight: 38 },
  title: { flex: 1, textAlign: 'center', color: '#F5F8FF', fontFamily: FontFamily.bold, fontSize: 20 },
  headerSpacer: { width: 40 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 24 },
  card: { overflow: 'hidden', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#1A8CFF', backgroundColor: '#06284F' },
  label: { marginTop: 16, marginBottom: 8, color: '#CDE5FF', fontFamily: FontFamily.medium, fontSize: 13 },
  required: { color: Palette.cyan },
  input: { height: 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#0872C9', color: '#F5F9FF', fontFamily: FontFamily.regular, fontSize: 14, backgroundColor: '#041C3A' },
  select: { minHeight: 52, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: '#0872C9', backgroundColor: '#041C3A' },
  placeholder: { flex: 1, color: '#8FB5E6', fontFamily: FontFamily.regular, fontSize: 14 },
  selected: { flex: 1, color: '#F5F9FF', fontFamily: FontFamily.regular, fontSize: 14 },
  chevron: { color: '#9FD0FC', fontSize: 18 },
  dateInput: { flex: 1, color: '#F5F9FF', fontFamily: FontFamily.regular, fontSize: 14 },
  repository: { minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  repositoryText: { flex: 1, color: '#E7F4FF', fontFamily: FontFamily.medium, fontSize: 13 },
  repositoryMeta: { color: '#75BFF0', fontFamily: FontFamily.regular, fontSize: 11, textTransform: 'capitalize' },
  unlink: { padding: 12 },
  unlinkText: { color: '#FFADB4', fontFamily: FontFamily.medium, fontSize: 13 },
  helper: { marginTop: 8, color: '#7FA9D4', fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17 },
  error: { marginTop: 10, color: '#FF9DA5', fontFamily: FontFamily.regular, fontSize: 12 },
  loading: { margin: 24, color: '#A9CEEE', fontFamily: FontFamily.regular, fontSize: 13 },
});
