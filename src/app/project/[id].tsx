import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '../../../convex/_generated/api';
import { AppShell } from '@/components/app-shell';
import { CardPattern } from '@/components/card-pattern';
import { ProgressBar, StatusBadge, type Status } from '@/components/ui/devtask-ui';
import { FontFamily, Palette, Radius } from '@/constants/theme';
import { runOrQueue } from '@/lib/offline-queue';

const tabs = ['Overview', 'Features', 'GitHub'] as const;
type Tab = (typeof tabs)[number];
const weightValue = { small: 1, medium: 2, large: 3 } as const;

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useQuery(api.projects.get, id ? { projectId: id as never } : 'skip');
  const createFeature = useMutation(api.features.create);
  const toggleFeature = useMutation(api.features.toggleComplete);
  const removeFeature = useMutation(api.features.remove);
  const setFocus = useMutation(api.projects.setFocus);
  const setState = useMutation(api.projects.setState);
  const syncRepository = useAction(api.github.syncRepository);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');

  if (detail === undefined) return <AppShell title="Project"><Text style={styles.loading}>Loading project…</Text></AppShell>;
  if (!detail) {
    return (
      <AppShell title="Project">
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Project not found</Text>
          <Pressable onPress={() => router.replace('/(app)/projects')}><Text style={styles.link}>Back to projects</Text></Pressable>
        </View>
      </AppShell>
    );
  }

  const { project, features, githubActivity } = detail;
  const repository = githubActivity;
  const color = project.state === 'completed' ? Palette.cyan : project.health === 'active' ? Palette.mint : project.health === 'slowing' ? Palette.amber : project.health === 'stalled' ? Palette.orange : Palette.red;
  const v1Features = features.filter((feature: Feature) => feature.bucket === 'v1');
  const completedCount = v1Features.filter((feature: Feature) => feature.state === 'completed').length;
  const banner = deadlineBanner(project.deadline, project.progress, project.health, project.healthReasons[0]);
  const sparkline = monthlySparkline(v1Features);

  const add = async () => {
    if (!title.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const created = await runOrQueue('feature.create', { projectId: project._id, title }, () => createFeature({ projectId: project._id, title, bucket: 'v1', weight: 'small' }));
      if (created.queued) setError('Saved offline. This feature will sync when you reconnect.');
      setTitle('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to add feature.');
    } finally {
      setAdding(false);
    }
  };

  const confirmComplete = () => Alert.alert('Mark project as shipped?', 'This is a manual decision. You can keep working until you are ready to ship.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Mark shipped', onPress: () => void setState({ projectId: project._id, state: 'completed' }) },
  ]);

  const refreshGitHub = async () => {
    if (!repository) return;
    try {
      await syncRepository({ repositoryId: repository._id });
    } catch (caughtError) {
      Alert.alert('Could not refresh GitHub', caughtError instanceof Error ? caughtError.message : 'Please try again.');
    }
  };

  return (
    <AppShell
      title={project.name}
      showBack
      action={
        <Pressable
          accessibilityLabel="Project actions"
          style={styles.menuButton}
          onPress={() => Alert.alert(project.name, undefined, [
            { text: 'Edit project', onPress: () => router.push({ pathname: '/edit-project', params: { id: project._id } }) },
            { text: project.focus ? 'Focus selected' : 'Set as focus', onPress: () => void setFocus({ projectId: project._id }) },
            { text: repository ? 'Refresh GitHub activity' : 'No GitHub repository', onPress: repository ? () => void refreshGitHub() : undefined },
            { text: 'Mark shipped', onPress: confirmComplete },
            { text: 'Archive project', style: 'destructive', onPress: () => void setState({ projectId: project._id, state: 'archived' }) },
            { text: 'Cancel', style: 'cancel' },
          ])}>
          <FontAwesome color="#B6D8FA" name="ellipsis-h" size={18} />
        </Pressable>
      }>
      <View style={styles.hero}>
        <LinearGradient colors={['#0A3E78', '#062D5C', '#041E3C']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <CardPattern color={Palette.cyan} opacity={0.08} ornaments={false} />
        <View style={styles.heroTop}>
          <Text style={styles.eyebrow}>{project.focus ? 'FOCUS PROJECT' : 'PROJECT'}</Text>
          <StatusBadge status={(project.state === 'completed' ? 'completed' : project.health) as Status} />
        </View>
        <Text numberOfLines={1} style={styles.heroName}>{project.name}</Text>
        <Text style={styles.focus}>{project.repositoryName || 'Personal project'}</Text>
        <View style={styles.heroBody}>
          <View style={styles.heroMetric}>
            <Text style={styles.heroPercent}>{project.progress}%</Text>
            <Text style={styles.heroCaption}>Complete</Text>
          </View>
          <BarGraph color={color} points={sparkline} />
        </View>
        <View style={styles.heroBar}><ProgressBar color={Palette.cyan} value={project.progress} /></View>
        <Text style={styles.heroMeta}>{completedCount} of {v1Features.length} v1 features complete</Text>
      </View>

      {banner ? (
        <View style={[styles.banner, { borderColor: `${banner.color}88` }]}>
          <FontAwesome color={banner.color} name="exclamation-triangle" size={13} />
          <Text style={[styles.bannerText, { color: banner.color }]}>{banner.text}</Text>
        </View>
      ) : null}

      <View style={styles.tabs}>
        {tabs.map((item) => {
          const selected = tab === item;
          return (
            <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={item} onPress={() => setTab(item)} style={styles.tab}>
              {selected ? (
                <LinearGradient colors={[Palette.sky, Palette.blue]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.tabSelected}>
                  <Text style={styles.tabTextSelected}>{item}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.tabText}>{item}</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {tab === 'Overview' ? (
        <>
          <View style={styles.card}>
            <CardPattern color={Palette.cyan} opacity={0.08} />
            <Text style={styles.cardTitle}>Project Overview</Text>
            <OverviewRow icon="heartbeat" label="Health" value={project.health} trailing={<StatusBadge status={(project.state === 'completed' ? 'completed' : project.health) as Status} />} />
            <OverviewRow icon="code-fork" label="Repository" value={project.repositoryName || 'Not linked'} />
            <OverviewRow icon="flag" label="Deadline" value={project.deadline ? formatDeadline(project.deadline) : 'No deadline'} />
            <View style={styles.overviewProgress}>
              <Text style={styles.overviewLabel}>Progress</Text>
              <ProgressBar color={color} value={project.progress} />
              <Text style={styles.overviewPercent}>{project.progress}%</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Key milestones</Text>
              <Pressable onPress={() => setTab('Features')}><Text style={styles.viewAll}>View All</Text></Pressable>
            </View>
            {(v1Features.slice(0, 4)).map((feature: Feature) => (
              <View key={feature._id} style={styles.milestone}>
                <View style={[styles.box, feature.state === 'completed' && styles.boxDone]}>{feature.state === 'completed' ? <Text style={styles.tick}>✓</Text> : null}</View>
                <Text style={[styles.milestoneTitle, feature.state === 'completed' && styles.featureDone]}>{feature.title}</Text>
              </View>
            ))}
            {!v1Features.length ? <Text style={styles.muted}>Add your first small feature to unlock progress.</Text> : null}
          </View>
        </>
      ) : null}

      {tab === 'Features' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>v1 Features</Text>
          {features.length ? features.map((feature: Feature) => (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: feature.state === 'completed' }}
              key={feature._id}
              onPress={() => void runOrQueue('feature.toggle', { featureId: feature._id }, () => toggleFeature({ featureId: feature._id }))}
              style={styles.feature}>
              <View style={[styles.box, feature.state === 'completed' && styles.boxDone]}>{feature.state === 'completed' ? <Text style={styles.tick}>✓</Text> : null}</View>
              <View style={styles.featureCopy}>
                <Text style={[styles.featureTitle, feature.state === 'completed' && styles.featureDone]}>{feature.title}</Text>
                <Text style={styles.featureMeta}>{feature.weight} · {feature.bucket}</Text>
              </View>
              <Pressable accessibilityLabel={`Edit ${feature.title}`} hitSlop={8} onPress={() => router.push({ pathname: '/edit-feature', params: { id: feature._id } })}>
                <FontAwesome color="#8BC5F6" name="pencil" size={13} />
              </Pressable>
              <Pressable accessibilityLabel={`Delete ${feature.title}`} hitSlop={8} onPress={() => Alert.alert('Delete feature?', feature.title, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void removeFeature({ featureId: feature._id }) }])}>
                <FontAwesome color="#D47B8A" name="trash-o" size={13} />
              </Pressable>
            </Pressable>
          )) : <Text style={styles.muted}>Add your first small feature to unlock progress.</Text>}
          <View style={styles.addRow}>
            <TextInput accessibilityLabel="New feature" onChangeText={setTitle} placeholder="Add a feature…" placeholderTextColor="#86ADD7" style={styles.input} value={title} />
            <Pressable accessibilityLabel="Add feature" accessibilityRole="button" disabled={adding} onPress={() => void add()} style={styles.addButton}>
              <Text style={styles.addText}>{adding ? '…' : 'Add'}</Text>
            </Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : null}

      {tab === 'GitHub' ? (
        <View style={styles.card}>
          {githubActivity ? (
            <>
              <View style={styles.githubTop}>
                <View style={styles.githubIcon}><FontAwesome color={Palette.cyan} name="github" size={16} /></View>
                <View style={styles.featureCopy}>
                  <Text numberOfLines={1} style={styles.cardTitle}>{githubActivity.fullName}</Text>
                  <Text style={styles.muted}>{githubActivity.lastSyncAt ? `Synced ${new Date(githubActivity.lastSyncAt).toLocaleString()}` : 'Waiting for first sync'} · {githubActivity.availability === 'available' ? 'Available' : githubActivity.availability}</Text>
                </View>
              </View>
              <View style={styles.githubStats}>
                <View style={styles.githubStat}><Text style={styles.githubValue}>{githubActivity.recentCommitCount}</Text><Text style={styles.muted}>Commits</Text></View>
                <View style={styles.githubStat}><Text style={styles.githubValue}>{githubActivity.openIssueCount}</Text><Text style={styles.muted}>Issues</Text></View>
                <View style={styles.githubStat}><Text style={styles.githubValue}>{githubActivity.openPullRequestCount}</Text><Text style={styles.muted}>PRs</Text></View>
              </View>
              {githubActivity.syncError ? <Text style={styles.error}>{githubActivity.syncError}</Text> : null}
              <Pressable accessibilityRole="button" onPress={() => void refreshGitHub()} style={styles.refresh}><Text style={styles.addText}>Refresh activity</Text></Pressable>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>No repository linked</Text>
              <Text style={styles.muted}>Edit this project to import a GitHub repository and track commits here.</Text>
            </>
          )}
        </View>
      ) : null}
    </AppShell>
  );
}

type Feature = {
  _id: string;
  title: string;
  bucket: 'v1' | 'backlog';
  weight: 'small' | 'medium' | 'large';
  state: 'open' | 'completed';
  completedAt?: number;
  createdAt: number;
};

function OverviewRow({ icon, label, value, trailing }: { icon: ComponentProps<typeof FontAwesome>['name']; label: string; value: string; trailing?: ReactNode }) {
  return (
    <View style={styles.overviewRow}>
      <View style={styles.overviewIcon}><FontAwesome color={Palette.cyan} name={icon} size={13} /></View>
      <View style={styles.featureCopy}>
        <Text style={styles.overviewLabel}>{label}</Text>
        <Text style={styles.overviewValue}>{value}</Text>
      </View>
      {trailing}
    </View>
  );
}

function BarGraph({ color, points }: { color: string; points: Array<{ label: string; value: number }> }) {
  const peak = Math.max(...points.map((point) => point.value), 1);
  return (
    <View style={styles.graph}>
      {points.map((point) => (
        <View key={point.label} style={styles.graphColumn}>
          <View style={styles.graphTrack}>
            <LinearGradient
              colors={[color, Palette.cyan]}
              end={{ x: 0.5, y: 0 }}
              start={{ x: 0.5, y: 1 }}
              style={[styles.graphBar, { height: `${Math.max(12, (point.value / peak) * 100)}%` }]}
            />
          </View>
          <Text style={styles.graphLabel}>{point.label}</Text>
        </View>
      ))}
    </View>
  );
}

function monthlySparkline(features: Feature[]) {
  const now = new Date();
  const months = Array.from({ length: 4 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (3 - index), 1);
    return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleString('en-US', { month: 'short' }), start: date.getTime(), end: new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime() };
  });
  const total = features.reduce((sum, feature) => sum + weightValue[feature.weight], 0) || 1;
  let completed = 0;
  return months.map((month) => {
    completed += features.filter((feature) => feature.state === 'completed' && (feature.completedAt ?? 0) >= month.start && (feature.completedAt ?? 0) < month.end).reduce((sum, feature) => sum + weightValue[feature.weight], 0);
    return { label: month.label, value: Math.round((completed / total) * 100) };
  });
}

function deadlineBanner(deadline: string | undefined, progress: number, health: string, reason?: string) {
  if (deadline) {
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (Number.isNaN(days)) return null;
    if (days < 0) return { color: Palette.red, text: `Deadline passed · ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago` };
    if (days <= 14 && progress < 80) return { color: Palette.amber, text: `Behind schedule · ${days} day${days === 1 ? '' : 's'} left` };
  }
  if (health === 'dying' || health === 'stalled') return { color: health === 'dying' ? Palette.red : Palette.orange, text: reason || `${health[0].toUpperCase()}${health.slice(1)} · needs attention` };
  return null;
}

function formatDeadline(deadline: string) {
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return deadline;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  menuButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#1A6FBE', backgroundColor: 'rgba(8, 47, 89, 0.9)' },
  hero: { overflow: 'hidden', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#1A8CFF' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#91C7F6', fontFamily: FontFamily.bold, fontSize: 11, letterSpacing: 1.1 },
  heroName: { marginTop: 10, color: '#F4F9FF', fontFamily: FontFamily.bold, fontSize: 24 },
  focus: { marginTop: 4, color: '#8BB6E3', fontFamily: FontFamily.regular, fontSize: 13 },
  heroBody: { marginTop: 18, flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  heroMetric: { width: 108 },
  heroPercent: { color: '#F4F9FF', fontFamily: FontFamily.extraBold, fontSize: 42, lineHeight: 46 },
  heroCaption: { marginTop: 2, color: '#9EC4EA', fontFamily: FontFamily.medium, fontSize: 13 },
  heroBar: { marginTop: 16 },
  heroMeta: { marginTop: 10, color: '#8BB6E3', fontFamily: FontFamily.regular, fontSize: 12 },
  graph: { flex: 1, height: 86, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  graphColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  graphTrack: { width: '72%', height: 64, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 8, backgroundColor: '#123B64' },
  graphBar: { width: '100%', minHeight: 8, borderRadius: 8 },
  graphLabel: { marginTop: 6, color: '#7FA9D4', fontFamily: FontFamily.medium, fontSize: 10 },
  banner: { minHeight: 42, marginTop: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, backgroundColor: '#3A2A12' },
  bannerText: { flex: 1, fontFamily: FontFamily.medium, fontSize: 13 },
  tabs: { marginTop: 16, flexDirection: 'row', gap: 6, padding: 4, borderRadius: Radius.pill, backgroundColor: '#082849' },
  tab: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: Radius.pill },
  tabSelected: { minHeight: 36, width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill },
  tabText: { color: '#8FB6E0', fontFamily: FontFamily.medium, fontSize: 12 },
  tabTextSelected: { color: '#FFF', fontFamily: FontFamily.semibold, fontSize: 12 },
  card: { overflow: 'hidden', marginTop: 14, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#1A8CFF', backgroundColor: '#06284F', gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: '#F2F8FF', fontFamily: FontFamily.semibold, fontSize: 16 },
  viewAll: { color: Palette.cyan, fontFamily: FontFamily.medium, fontSize: 12 },
  overviewRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  overviewIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#0A3A66' },
  overviewLabel: { color: '#8FB6E0', fontFamily: FontFamily.regular, fontSize: 11 },
  overviewValue: { marginTop: 2, color: '#EAF5FF', fontFamily: FontFamily.medium, fontSize: 13, textTransform: 'capitalize' },
  overviewProgress: { gap: 8 },
  overviewPercent: { color: Palette.cyan, fontFamily: FontFamily.bold, fontSize: 12 },
  milestone: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 10 },
  milestoneTitle: { flex: 1, color: '#E7F4FF', fontFamily: FontFamily.medium, fontSize: 14 },
  box: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: '#4C83B9', alignItems: 'center', justifyContent: 'center' },
  boxDone: { backgroundColor: Palette.mint, borderColor: Palette.mint },
  tick: { color: '#041C3A', fontFamily: FontFamily.bold, fontSize: 11 },
  feature: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureCopy: { flex: 1, minWidth: 0 },
  featureTitle: { color: '#E7F4FF', fontFamily: FontFamily.medium, fontSize: 14 },
  featureDone: { color: '#82ACC9', textDecorationLine: 'line-through' },
  featureMeta: { marginTop: 2, color: '#7EADD8', fontFamily: FontFamily.regular, fontSize: 11 },
  muted: { color: '#8CB9E4', fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  addRow: { minHeight: 46, flexDirection: 'row', gap: 8 },
  input: { flex: 1, paddingHorizontal: 12, color: '#EAF6FF', fontFamily: FontFamily.regular, fontSize: 14, borderRadius: 10, backgroundColor: '#041C3A' },
  addButton: { paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: Palette.blue },
  addText: { color: '#FFF', fontFamily: FontFamily.semibold, fontSize: 13 },
  error: { color: '#FF9EA5', fontFamily: FontFamily.regular, fontSize: 12 },
  githubTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  githubIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#0A3A66' },
  githubStats: { flexDirection: 'row', gap: 8 },
  githubStat: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#041C3A' },
  githubValue: { color: '#F2F8FF', fontFamily: FontFamily.bold, fontSize: 18 },
  refresh: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: Palette.blue },
  loading: { color: '#A9CEEE', fontFamily: FontFamily.regular, fontSize: 13 },
  empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { color: '#EDF7FF', fontFamily: FontFamily.semibold, fontSize: 16 },
  link: { color: Palette.cyan, fontFamily: FontFamily.medium, fontSize: 13 },
});
