import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import Svg, { Circle } from 'react-native-svg';

import { api } from '../../convex/_generated/api';
import { AppShell, SectionTitle } from '@/components/app-shell';
import { CardPattern } from '@/components/card-pattern';
import { AppButton, ProgressBar, StatusBadge, type Status } from '@/components/ui/devtask-ui';
import { FontFamily, Palette, Radius } from '@/constants/theme';
import { runOrQueue } from '@/lib/offline-queue';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const home = useQuery(api.projects.home, {});
  const unreadNotifications = useQuery(api.notifications.unreadCount, {});
  const today = new Date().toISOString().slice(0, 10);
  const checklist = useQuery(api.checklist.today, { localDate: today });
  const createChecklist = useMutation(api.checklist.create);
  const toggleChecklist = useMutation(api.checklist.toggle);
  const [checklistTitle, setChecklistTitle] = useState('');
  const firstName = user?.firstName || 'there';
  const greeting = getGreeting();
  const bell = (
    <Pressable accessibilityLabel="Notifications" accessibilityRole="button" hitSlop={8} onPress={() => router.push('/notifications')} style={styles.bellButton}>
      <FontAwesome color="#D4EBFF" name={unreadNotifications ? 'bell' : 'bell-o'} size={18} />
      {unreadNotifications ? <View style={styles.bellBadge} /> : null}
    </Pressable>
  );

  if (home === undefined) {
    return (
      <AppShell action={bell}>
        <Text style={styles.greeting}>{greeting}, {firstName} 👋</Text>
        <Text style={styles.loading}>Loading your workspace…</Text>
      </AppShell>
    );
  }

  if (!home?.focusProject) {
    return (
      <AppShell action={bell}>
        <Text style={styles.greeting}>{greeting}, {firstName} 👋</Text>
        <Text style={styles.day}>Start small. Finish strong.</Text>
        <View style={styles.empty}>
          <CardPattern color={Palette.cyan} opacity={0.16} />
          <View style={styles.emptyIcon}><FontAwesome color={Palette.cyan} name="rocket" size={28} /></View>
          <Text style={styles.emptyTitle}>No projects yet</Text>
          <Text style={styles.emptyCopy}>Create one project, then choose its smallest next feature.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/add-project')} style={styles.create}>
            <Text style={styles.createText}>+ Create your first project</Text>
          </Pressable>
        </View>
      </AppShell>
    );
  }

  const { focusProject, nextFeature, projects, summary, repositoryActivity, githubConnected } = home;
  const focusColor = healthColor(focusProject.health);
  const isReadyToShip = focusProject.progress >= 100 && !nextFeature;
  const commitStatus = getCommitStatus({
    githubConnected,
    hasLinkedRepo: Boolean(focusProject.repositoryId || focusProject.repositoryName),
    availability: repositoryActivity?.availability,
    latestCommitAt: repositoryActivity?.latestCommitAt,
    repositoryName: repositoryActivity?.fullName || focusProject.repositoryName,
  });

  const addChecklistItem = () => {
    if (!checklistTitle.trim()) return;
    const title = checklistTitle.trim();
    void runOrQueue('checklist.create', { title, localDate: today }, () => createChecklist({ title, localDate: today }));
    setChecklistTitle('');
  };

  return (
    <AppShell action={bell}>
      <Text style={styles.greeting}>{greeting}, {firstName} 👋</Text>
      <Text style={styles.day}>Keep moving your focus project forward.</Text>

      <View style={styles.focusCard}>
        <LinearGradient colors={['#0A3E78', '#062D5C', '#041E3C']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <CardPattern color={Palette.cyan} opacity={0.2} />
        <View style={styles.focusGlow} />
        <Pressable accessibilityRole="button" onPress={() => router.push(`/project/${focusProject._id}` as never)} style={styles.focusInner}>
          <View style={styles.focusTop}>
            <Text style={styles.eyebrow}>TODAY’S FOCUS</Text>
            {isReadyToShip ? (
              <View style={[styles.healthPill, { backgroundColor: `${Palette.mint}22` }]}>
                <View style={[styles.healthDot, { backgroundColor: Palette.mint }]} />
                <Text style={[styles.healthText, { color: Palette.mint }]}>Ready to ship</Text>
              </View>
            ) : (
              <StatusBadge status={focusProject.health as Status} />
            )}
          </View>
          <View style={styles.focusBody}>
            <ProgressRing color={focusColor} value={focusProject.progress} />
            <View style={styles.focusCopy}>
              <Text numberOfLines={1} style={styles.focusName}>{focusProject.name}</Text>
              <Text numberOfLines={2} style={styles.nextFeature}>
                {isReadyToShip ? 'All v1 features complete' : `Next: ${nextFeature?.title || 'Define your first v1 feature'}`}
              </Text>
              <Text style={styles.nextMeta}>
                {isReadyToShip
                  ? 'Review your final checklist, then decide when to ship.'
                  : nextFeature
                    ? `${home.nextFeatureEstimateMinutes} min · ${nextFeature.weight} · ${focusProject.progress}% complete`
                    : 'Add a feature to unlock progress'}
              </Text>
            </View>
          </View>
          <View style={styles.focusTrackWrap}>
            <ProgressBar color={focusColor} value={focusProject.progress} />
          </View>
          {repositoryActivity?.availability === 'reauthorizationRequired' || repositoryActivity?.availability === 'missing'
            ? <Text style={styles.syncWarning}>Reconnect GitHub to refresh repository activity.</Text>
            : repositoryActivity?.syncError
              ? <Text style={styles.syncWarning}>GitHub sync needs attention; cached activity is still shown.</Text>
              : null}
        </Pressable>
        <View style={styles.focusAction}>
          <AppButton
            icon={<Text style={styles.ctaArrow}>→</Text>}
            label={isReadyToShip ? 'Review and ship' : nextFeature ? 'Continue this feature' : 'Add a v1 feature'}
            onPress={() => router.push(`/project/${focusProject._id}` as never)}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(githubConnected ? (`/project/${focusProject._id}` as never) : '/settings')}
        style={[styles.commitCard, { borderColor: `${commitStatus.color}88` }]}>
        <CardPattern color={commitStatus.color} opacity={0.12} />
        <View style={[styles.commitIcon, { backgroundColor: `${commitStatus.color}22` }]}>
          <FontAwesome color={commitStatus.color} name="github" size={16} />
        </View>
        <View style={styles.commitCopy}>
          <Text style={styles.commitTitle}>Commit health · {commitStatus.label}</Text>
          <Text style={styles.commitDetail}>{commitStatus.detail}</Text>
        </View>
        <View style={[styles.commitDot, { backgroundColor: commitStatus.color }]} />
      </Pressable>

      <View style={styles.stats}>
        <Stat label="Active" value={String(summary.active)} tone={Palette.cyan} />
        <Stat label="At risk" value={String(summary.slowing)} tone={Palette.amber} />
        <Stat label="Finished" value={String(summary.completed)} tone={Palette.mint} />
      </View>

      <SectionTitle action={
        <View style={styles.sectionActions}>
          <Pressable onPress={() => router.push('/(app)/projects')}><Text style={styles.seeAll}>See all</Text></Pressable>
          <Pressable accessibilityLabel="Add project" accessibilityRole="button" onPress={() => router.push('/add-project')} style={styles.addProject}>
            <Text style={styles.addProjectText}>+</Text>
          </Pressable>
        </View>
      }>Your Projects</SectionTitle>
      <View style={styles.projectList}>
        {projects.map((project) => {
          const healthTone = healthColor(project.health);
          const progressTone = project.progress === 0 ? Palette.cyan : healthTone;
          return (
            <Pressable accessibilityRole="button" key={project._id} onPress={() => router.push(`/project/${project._id}` as never)} style={styles.projectRow}>
              <MiniRing color={progressTone} value={project.progress} />
              <View style={styles.projectCopy}>
                <View style={styles.projectNameRow}>
                  <Text numberOfLines={1} style={styles.rowName}>{project.name}</Text>
                  <Text style={[styles.rowPercent, { color: progressTone }]}>{project.progress}%</Text>
                </View>
                <Text numberOfLines={1} style={styles.repo}>{project.repositoryName || 'Personal project'}{project.focus ? ' · Focus' : ''}</Text>
                <View style={styles.rowTrack}><ProgressBar color={progressTone} value={project.progress} /></View>
              </View>
              <View style={[styles.projectStatus, { backgroundColor: `${healthTone}22` }]}>
                <View style={[styles.projectStatusDot, { backgroundColor: healthTone }]} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.motivation}>
        <CardPattern color={Palette.cyan} opacity={0.1} />
        <View style={styles.motivationIcon}><FontAwesome color={Palette.cyan} name="lightbulb-o" size={13} /></View>
        <View>
          <Text style={styles.motivationTitle}>Consistency beats motivation.</Text>
          <Text style={styles.motivationCopy}>Keep going — one feature at a time.</Text>
        </View>
      </View>

      <SectionTitle>Today’s checklist</SectionTitle>
      <View style={styles.checklist}>
        {checklist?.length
          ? checklist.map((item) => (
            <Pressable
              key={item._id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.state === 'completed' }}
              onPress={() => void runOrQueue('checklist.toggle', { itemId: item._id }, () => toggleChecklist({ itemId: item._id }))}
              style={styles.checkItem}>
              <FontAwesome color={item.state === 'completed' ? Palette.mint : '#82B9E6'} name={item.state === 'completed' ? 'check-circle' : 'circle-o'} size={14} />
              <Text style={[styles.checkText, item.state === 'completed' && styles.checkDone]}>{item.title}</Text>
            </Pressable>
          ))
          : <Text style={styles.checkEmpty}>No small tasks yet. Add one to keep today focused.</Text>}
        <View style={styles.checkAdd}>
          <TextInput
            accessibilityLabel="Add checklist item"
            onChangeText={setChecklistTitle}
            onSubmitEditing={addChecklistItem}
            placeholder="Add a small task…"
            placeholderTextColor="#83B0DA"
            style={styles.checkInput}
            value={checklistTitle}
          />
          <Pressable accessibilityLabel="Add checklist item" onPress={addChecklistItem}>
            <FontAwesome color={Palette.cyan} name="plus-circle" size={18} />
          </Pressable>
        </View>
      </View>
    </AppShell>
  );
}

function healthColor(health: string) {
  if (health === 'active') return Palette.mint;
  if (health === 'slowing') return Palette.amber;
  if (health === 'stalled') return Palette.orange;
  return Palette.red;
}

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour >= 18 ? 'Good night' : 'Good afternoon';
}

function getCommitStatus({
  githubConnected,
  hasLinkedRepo,
  availability,
  latestCommitAt,
  repositoryName,
}: {
  githubConnected: boolean;
  hasLinkedRepo: boolean;
  availability?: string;
  latestCommitAt?: number;
  repositoryName?: string;
}) {
  if (availability === 'reauthorizationRequired') {
    return { label: 'Reconnect', detail: 'GitHub authorization needs to be renewed to keep commit tracking live.', color: Palette.amber };
  }
  if (availability === 'missing') {
    return { label: 'Missing', detail: 'This repository is no longer available to the connected GitHub account.', color: Palette.red };
  }
  if (!githubConnected) {
    return { label: 'Not connected', detail: 'Connect GitHub in Settings to track commits on this project.', color: '#8EBBE6' };
  }
  if (!hasLinkedRepo) {
    return { label: 'Available', detail: 'GitHub is connected. Link this focus project to a repository to track commits.', color: Palette.mint };
  }
  if (!latestCommitAt) {
    return { label: 'Available', detail: repositoryName ? `${repositoryName} is available and waiting for the first commit sync.` : 'This repository is available. Waiting for the first commit sync.', color: Palette.mint };
  }
  const age = Date.now() - latestCommitAt;
  if (age <= 24 * 60 * 60 * 1000) return { label: 'Healthy', detail: 'A commit was recorded within the last 24 hours.', color: Palette.mint };
  if (age <= 7 * 24 * 60 * 60 * 1000) return { label: 'Aging', detail: 'The latest commit is more than 24 hours old.', color: Palette.amber };
  return { label: 'Needs attention', detail: 'No commit has been recorded in the last 7 days.', color: Palette.red };
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={styles.stat}>
      <CardPattern color={tone} opacity={0.1} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

function ProgressRing({ color, value }: { color: string; value: number }) {
  const size = 76;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={[styles.progressRing, { width: size, height: size }]}>
      <Svg height={size} width={size}>
        <Circle cx={size / 2} cy={size / 2} fill="none" r={r} stroke="#164A73" strokeWidth={stroke} />
        <Circle cx={size / 2} cy={size / 2} fill="none" origin={`${size / 2}, ${size / 2}`} r={r} rotation="-90" stroke={color} strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - value / 100)} strokeLinecap="round" strokeWidth={stroke} />
      </Svg>
      <Text style={styles.ringNumber}>{value}%</Text>
    </View>
  );
}

function MiniRing({ color, value }: { color: string; value: number }) {
  const size = 32;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.miniRing}>
      <Svg height={size} width={size}>
        <Circle cx={size / 2} cy={size / 2} fill="none" r={r} stroke="#164A73" strokeWidth={stroke} />
        <Circle cx={size / 2} cy={size / 2} fill="none" origin={`${size / 2}, ${size / 2}`} r={r} rotation="-90" stroke={color} strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - value / 100)} strokeLinecap="round" strokeWidth={stroke} />
      </Svg>
      <Text style={styles.miniText}>{value}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { marginTop: 1, color: '#F5F9FF', fontFamily: FontFamily.bold, fontSize: 22 },
  day: { marginTop: 4, color: '#84AFE0', fontFamily: FontFamily.regular, fontSize: 13 },
  loading: { marginTop: 22, color: '#8AB6E1', fontFamily: FontFamily.regular, fontSize: 12 },
  bellButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#1A6FBE', backgroundColor: 'rgba(8, 47, 89, 0.9)' },
  bellBadge: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: Palette.cyan },
  focusCard: { marginTop: 16, overflow: 'hidden', borderRadius: Radius.large, borderWidth: 1, borderColor: '#1A8CFF', shadowColor: Palette.cyan, shadowOpacity: 0.28, shadowRadius: 18, elevation: 8 },
  focusInner: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8 },
  focusAction: { paddingHorizontal: 18, paddingBottom: 16 },
  focusGlow: { position: 'absolute', right: -20, top: -28, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(0, 209, 255, 0.14)' },
  focusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#91C7F6', fontFamily: FontFamily.bold, fontSize: 11, letterSpacing: 1.2 },
  healthPill: { paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99 },
  healthDot: { width: 5, height: 5, borderRadius: 3 },
  healthText: { fontFamily: FontFamily.medium, fontSize: 11, textTransform: 'capitalize' },
  focusBody: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  progressRing: { alignItems: 'center', justifyContent: 'center' },
  ringNumber: { position: 'absolute', color: '#E8F7FF', fontFamily: FontFamily.bold, fontSize: 15 },
  focusCopy: { flex: 1, minWidth: 0 },
  focusName: { color: '#F2F8FF', fontFamily: FontFamily.semibold, fontSize: 20 },
  nextFeature: { marginTop: 5, color: '#C8E3FF', fontFamily: FontFamily.medium, fontSize: 13 },
  nextMeta: { marginTop: 6, color: '#78B9E9', fontFamily: FontFamily.regular, fontSize: 11 },
  focusTrackWrap: { marginTop: 16, marginBottom: 8 },
  ctaArrow: { color: '#FFFFFF', fontFamily: FontFamily.semibold, fontSize: 18 },
  commitCard: { marginTop: 12, overflow: 'hidden', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, backgroundColor: '#062549' },
  commitIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  commitCopy: { flex: 1 },
  commitTitle: { color: '#E6F4FF', fontFamily: FontFamily.semibold, fontSize: 13 },
  commitDetail: { marginTop: 3, color: '#8EBBE6', fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 15 },
  commitDot: { width: 8, height: 8, borderRadius: 4 },
  stats: { marginTop: 12, flexDirection: 'row', gap: 8 },
  stat: { flex: 1, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#17619D', backgroundColor: '#082D59' },
  statLabel: { color: '#9CC6F0', fontFamily: FontFamily.regular, fontSize: 11 },
  statValue: { marginTop: 4, fontFamily: FontFamily.bold, fontSize: 22 },
  seeAll: { color: Palette.cyan, fontFamily: FontFamily.medium, fontSize: 12 },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addProject: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: Palette.blue },
  addProjectText: { color: '#FFF', fontFamily: FontFamily.regular, fontSize: 20, lineHeight: 22 },
  projectList: { gap: 8 },
  projectRow: { minHeight: 78, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: '#0C5799', backgroundColor: '#05264E' },
  miniRing: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  miniText: { position: 'absolute', color: '#DEF3FF', fontFamily: FontFamily.mono, fontSize: 7 },
  projectCopy: { flex: 1, minWidth: 0 },
  projectNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowName: { flex: 1, color: '#EAF5FF', fontFamily: FontFamily.medium, fontSize: 14 },
  rowPercent: { fontFamily: FontFamily.bold, fontSize: 12 },
  repo: { marginTop: 3, color: '#79A9D9', fontFamily: FontFamily.regular, fontSize: 11 },
  rowTrack: { marginTop: 8 },
  projectStatus: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  projectStatusDot: { width: 5, height: 5, borderRadius: 3 },
  motivation: { minHeight: 56, overflow: 'hidden', marginTop: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: '#175A91', backgroundColor: '#062A52' },
  motivationIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#073B6C' },
  motivationTitle: { color: '#DDF0FF', fontFamily: FontFamily.medium, fontSize: 13 },
  motivationCopy: { marginTop: 2, color: '#82B5E3', fontFamily: FontFamily.regular, fontSize: 11 },
  empty: { minHeight: 330, overflow: 'hidden', marginTop: 18, padding: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#0A68B6', backgroundColor: '#06274F' },
  emptyIcon: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', borderRadius: 38, backgroundColor: '#063B6C', borderWidth: 1, borderColor: Palette.cyan },
  emptyTitle: { marginTop: 18, color: '#F1F8FF', fontFamily: FontFamily.bold, fontSize: 18 },
  emptyCopy: { marginTop: 8, color: '#9FC5EC', textAlign: 'center', fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  create: { marginTop: 20, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 22, backgroundColor: Palette.blue },
  syncWarning: { marginTop: 10, color: '#FFC343', fontFamily: FontFamily.medium, fontSize: 11 },
  checklist: { marginTop: 8, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#0A5C9F', backgroundColor: '#06274F' },
  checkItem: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkText: { flex: 1, color: '#DCEFFF', fontFamily: FontFamily.regular, fontSize: 13 },
  checkDone: { color: '#7FA8C9', textDecorationLine: 'line-through' },
  checkEmpty: { paddingVertical: 9, color: '#82B5E3', fontFamily: FontFamily.regular, fontSize: 12 },
  checkAdd: { marginTop: 7, paddingTop: 7, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#164A73' },
  checkInput: { flex: 1, color: '#EAF6FF', fontFamily: FontFamily.regular, fontSize: 13 },
  createText: { color: '#FFF', fontFamily: FontFamily.semibold, fontSize: 13 },
});
