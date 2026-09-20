import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../convex/_generated/api';
import { AppButton } from '@/components/ui/devtask-ui';
import { CardPattern } from '@/components/card-pattern';
import { FontFamily, Palette, Radius } from '@/constants/theme';

export default function AddProjectScreen() {
  const router = useRouter();
  const createProject = useMutation(api.projects.create);
  const repositories = useQuery(api.github.listRepositories, {});
  const [name, setName] = useState('');
  const [repositoryOpen, setRepositoryOpen] = useState(false);
  const [repositoryId, setRepositoryId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selectedRepository = repositories?.find((repository: { _id: string }) => repository._id === repositoryId);

  const save = async () => {
    if (!name.trim()) { setError('Enter a project name.'); return; }
    setSaving(true);
    setError(null);
    try {
      await createProject({
        name,
        repositoryId: selectedRepository?.githubRepositoryId,
        repositoryName: selectedRepository?.fullName,
        repositoryUrl: selectedRepository?.url,
        deadline: deadline || undefined,
      });
      router.replace('/(app)/projects');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to add project.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#04264A', '#021225', '#020914']} end={{ x: 0.8, y: 1 }} start={{ x: 0.1, y: 0 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Add Project</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <CardPattern color={Palette.cyan} opacity={0.1} />
            <Text style={styles.label}>Project name <Text style={styles.required}>*</Text></Text>
            <TextInput accessibilityLabel="Project name" onChangeText={setName} placeholder="e.g. Mobile App" placeholderTextColor="#8FB5E6" selectionColor={Palette.cyan} style={styles.input} value={name} />
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>GitHub repository</Text>
            <Pressable accessibilityRole="button" onPress={() => setRepositoryOpen((open) => !open)} style={styles.select}>
              <Text numberOfLines={1} style={selectedRepository ? styles.selectedText : styles.placeholder}>
                {selectedRepository?.fullName || (repositories?.length ? 'Select repository' : 'Connect GitHub to select a repository')}
              </Text>
              <Text style={styles.chevron}>⌄</Text>
            </Pressable>
            {repositoryOpen ? repositories?.map((repository: { _id: string; fullName: string; visibility: string; githubRepositoryId: string; url: string }) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: repository._id === repositoryId }}
                key={repository._id}
                onPress={() => { setRepositoryId(repository._id); setRepositoryOpen(false); }}
                style={styles.repository}>
                <Text style={styles.repositoryText}>{repository.fullName}</Text>
                <Text style={styles.repositoryMeta}>{repository.visibility}</Text>
              </Pressable>
            )) : null}

            <Text style={styles.label}>Deadline</Text>
            <View style={styles.select}>
              <FontAwesome color="#8FB5E6" name="calendar-o" size={14} />
              <TextInput accessibilityLabel="Optional deadline" onChangeText={setDeadline} placeholder="Select date · YYYY-MM-DD" placeholderTextColor="#8FB5E6" selectionColor={Palette.cyan} style={styles.dateInput} value={deadline} />
            </View>
            <Text style={styles.helper}>Optional. Health uses this when the date is within 14 days and progress is below 80%.</Text>
          </View>
          <AppButton disabled={saving} label={saving ? 'Adding…' : 'Add Project'} onPress={() => void save()} />
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
  selectedText: { flex: 1, color: '#F5F9FF', fontFamily: FontFamily.regular, fontSize: 14 },
  chevron: { color: '#9FD0FC', fontSize: 18 },
  dateInput: { flex: 1, color: '#F5F9FF', fontFamily: FontFamily.regular, fontSize: 14 },
  repository: { minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1765A8' },
  repositoryText: { flex: 1, color: '#E7F4FF', fontFamily: FontFamily.medium, fontSize: 13 },
  repositoryMeta: { color: '#75BFF0', fontFamily: FontFamily.regular, fontSize: 11, textTransform: 'capitalize' },
  helper: { marginTop: 8, color: '#7FA9D4', fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17 },
  error: { marginTop: 8, color: '#FF9DA5', fontFamily: FontFamily.regular, fontSize: 12 },
});
