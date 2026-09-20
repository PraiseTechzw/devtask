import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAction, useQuery } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../../convex/_generated/api';
import { AppShell } from '@/components/app-shell';
import { CardPattern } from '@/components/card-pattern';
import { ProgressBar } from '@/components/ui/devtask-ui';
import { FontFamily, Palette, Radius } from '@/constants/theme';

const PERIODS = ['Week', 'Month', 'Year'] as const;
type PeriodLabel = (typeof PERIODS)[number];
const periodKey: Record<PeriodLabel, 'week' | 'month' | 'year'> = { Week: 'week', Month: 'month', Year: 'year' };
const AXIS = ['100%', '75%', '50%', '25%', '0%'] as const;
type ChartBar = { label: string; value: number; count: number };
type HeatCell = 'completed' | 'pending' | 'empty';
type HeatRow = { day: string; cells: HeatCell[] };

export default function ProgressScreen() {
  const [period, setPeriod] = useState<PeriodLabel>('Week');
  const [refreshing, setRefreshing] = useState(false);
  const didAutoSync = useRef(false);
  const analytics = useQuery(api.projects.analytics, { period: periodKey[period] });
  const syncLinked = useAction(api.github.syncLinkedRepositories);
  const startGitHub = useAction(api.github.start);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const result = await syncLinked();
      if (!result.total) Alert.alert('No imported repositories', 'Link a GitHub repository to a project to track activity here.');
      else if (!result.synced && result.skipped) Alert.alert('Already up to date', 'GitHub allows one manual refresh every 5 minutes. Cached activity is still shown.');
    } catch (error) {
      Alert.alert('Could not refresh GitHub', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (didAutoSync.current || !analytics?.github?.connected) return;
    const needsSync = analytics.github.repositories.some((repository: { lastSyncAt?: number }) => !repository.lastSyncAt);
    if (!needsSync) return;
    didAutoSync.current = true;
    void refresh();
  }, [analytics?.github?.connected, analytics?.github?.repositories]);

  const connectGitHub = async () => {
    try {
      await Linking.openURL(await startGitHub());
    } catch (error) {
      Alert.alert('Could not connect GitHub', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const refreshAction = (
    <Pressable accessibilityLabel="Refresh GitHub activity" accessibilityRole="button" hitSlop={10} onPress={() => void refresh()} style={styles.headerAction}>
      <FontAwesome color="#D4EBFF" name={refreshing ? 'clock-o' : 'refresh'} size={16} />
    </Pressable>
  );

  if (analytics === undefined) {
    return <AppShell title="Progress" action={refreshAction}><Text style={styles.loading}>Loading your progress…</Text></AppShell>;
  }

  const chart = analytics?.chart ?? [];
  const heatmap = analytics?.heatmap ?? [];
  const metrics = analytics?.metrics ?? { totalTasks: 0, completed: 0, inProgress: 0 };
  const periodSummary = analytics?.periodSummary ?? { projectsUpdated: 0, tasksCompleted: 0, completionRate: 0 };
  const github = analytics?.github;
  const periodCopy = period === 'Week' ? 'This week' : period === 'Month' ? 'This month' : 'This year';

  return (
    <AppShell title="Progress" action={refreshAction}>
      <View style={styles.period}>
        {PERIODS.map((item) => {
          const selected = period === item;
          const label = item === 'Week' ? 'This Week' : item === 'Month' ? 'This Month' : 'This Year';
          return (
            <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={item} onPress={() => setPeriod(item)} style={styles.periodTab}>
              {selected ? (
                <LinearGradient colors={[Palette.sky, Palette.blue]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.periodSelected}>
                  <Text style={styles.periodTextSelected}>{label}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.periodText}>{label}</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.performance}>
        <LinearGradient colors={['#083868', '#06284F', '#041E3C']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <CardPattern color={Palette.cyan} opacity={0.14} />
        <Text style={styles.cardTitle}>Project Performance</Text>
        <View style={styles.chart}>
          <View style={styles.axis}>
            {AXIS.map((label) => <Text key={label} style={styles.axisLabel}>{label}</Text>)}
          </View>
          <View style={styles.bars}>
            {chart.map((item: ChartBar, index: number) => (
              <View key={item.label} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={index === chart.length - 1 || item.value > 70 ? [Palette.cyan, Palette.sky] : ['#1A6FBE', Palette.blue]}
                    end={{ x: 0.5, y: 0 }}
                    start={{ x: 0.5, y: 1 }}
                    style={[styles.bar, { height: `${Math.max(item.value, item.count ? 12 : 6)}%` }]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric label="Total Tasks" value={metrics.totalTasks} />
        <Metric label="Completed" value={metrics.completed} />
        <Metric label="In Progress" value={metrics.inProgress} />
      </View>

      <View style={styles.heatmapCard}>
        <LinearGradient colors={['#083868', '#06284F']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <CardPattern color={Palette.cyan} opacity={0.1} />
        <Text style={styles.cardTitle}>Tasks Completion</Text>
        <View style={styles.heatmap}>
          {heatmap.map((row: HeatRow) => (
            <View key={row.day} style={styles.heatRow}>
              <Text style={styles.heatDay}>{row.day}</Text>
              <View style={styles.heatCells}>
                {row.cells.map((cell: HeatCell, index: number) => (
                  <View key={`${row.day}-${index}`} style={[styles.heatCell, cell === 'completed' ? styles.heatCompleted : cell === 'pending' ? styles.heatPending : styles.heatEmpty]} />
                ))}
              </View>
            </View>
          ))}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.heatCompleted]} /><Text style={styles.legendText}>Completed</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.heatPending]} /><Text style={styles.legendText}>Pending</Text></View>
        </View>
      </View>

      <View style={styles.summary}>
        <LinearGradient colors={['#083868', '#06284F']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <CardPattern color={Palette.mint} opacity={0.1} />
        <View style={styles.summaryTop}>
          <Text style={styles.cardTitle}>{period === 'Week' ? 'Weekly' : period === 'Month' ? 'Monthly' : 'Yearly'} Summary</Text>
          <View style={styles.summaryCheck}><FontAwesome color={Palette.mint} name="check" size={13} /></View>
        </View>
        <Text style={styles.summaryLine}>{periodSummary.projectsUpdated} Project{periodSummary.projectsUpdated === 1 ? '' : 's'} updated</Text>
        <Text style={styles.summaryLine}>{periodSummary.tasksCompleted} Task{periodSummary.tasksCompleted === 1 ? '' : 's'} Completed</Text>
        <View style={styles.summaryTrack}><ProgressBar color={Palette.cyan} value={periodSummary.completionRate} /></View>
      </View>

      {github && !github.connected ? (
        <Pressable accessibilityRole="button" onPress={() => void connectGitHub()} style={styles.githubCard}>
          <View style={styles.githubIcon}><FontAwesome color="#91C8F4" name="github" size={16} /></View>
          <View style={styles.githubCopy}>
            <Text style={styles.githubTitle}>GitHub not connected</Text>
            <Text style={styles.githubText}>Connect GitHub to track commits beside this progress view.</Text>
          </View>
          <Text style={styles.connect}>Connect</Text>
        </Pressable>
      ) : github ? (
        <View style={styles.githubCard}>
          <View style={styles.githubIcon}><FontAwesome color="#E7F4FF" name="github" size={16} /></View>
          <View style={styles.githubCopy}>
            <Text style={styles.githubTitle}>{github.stale ? 'GitHub · based on last sync' : 'GitHub connected'}</Text>
            <Text style={styles.githubText}>{periodCopy}: {github.totals.commits} commits · {github.totals.issues} issues · {github.totals.pullRequests} PRs</Text>
          </View>
          <FontAwesome color={Palette.cyan} name="check-circle" size={16} />
        </View>
      ) : null}
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { color: '#9CC6EE', fontFamily: FontFamily.regular, fontSize: 13 },
  headerAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#1A6FBE', backgroundColor: 'rgba(8, 47, 89, 0.9)' },
  period: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  periodTab: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, overflow: 'hidden' },
  periodSelected: { minHeight: 38, width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill },
  periodText: { color: '#8FB6E0', fontFamily: FontFamily.medium, fontSize: 12 },
  periodTextSelected: { color: '#FFFFFF', fontFamily: FontFamily.semibold, fontSize: 12 },
  performance: { overflow: 'hidden', minHeight: 248, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#1A8CFF' },
  cardTitle: { color: '#F2F8FF', fontFamily: FontFamily.semibold, fontSize: 16 },
  chart: { marginTop: 14, flexDirection: 'row', gap: 8, height: 168 },
  axis: { width: 36, justifyContent: 'space-between', paddingBottom: 22 },
  axisLabel: { color: '#6EA3D6', fontFamily: FontFamily.regular, fontSize: 10 },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  barTrack: { width: '78%', height: 146, justifyContent: 'flex-end' },
  bar: { width: '100%', minHeight: 8, borderRadius: 8 },
  barLabel: { marginTop: 8, color: '#8FB6E0', fontFamily: FontFamily.medium, fontSize: 10 },
  metrics: { marginTop: 16, flexDirection: 'row', gap: 8 },
  metric: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#145C9A', backgroundColor: '#06284F' },
  metricValue: { color: '#F4F9FF', fontFamily: FontFamily.bold, fontSize: 26 },
  metricLabel: { marginTop: 4, color: '#8FB6E0', fontFamily: FontFamily.regular, fontSize: 11 },
  heatmapCard: { overflow: 'hidden', marginTop: 16, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#1A8CFF' },
  heatmap: { marginTop: 14, gap: 8 },
  heatRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heatDay: { width: 32, color: '#8FB6E0', fontFamily: FontFamily.medium, fontSize: 11 },
  heatCells: { flex: 1, flexDirection: 'row', gap: 3 },
  heatCell: { flex: 1, height: 10, borderRadius: 3 },
  heatCompleted: { backgroundColor: Palette.cyan },
  heatPending: { backgroundColor: '#0B4A86' },
  heatEmpty: { backgroundColor: '#08325C' },
  legend: { marginTop: 14, flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 8, height: 8, borderRadius: 2 },
  legendText: { color: '#8FB6E0', fontFamily: FontFamily.regular, fontSize: 11 },
  summary: { overflow: 'hidden', marginTop: 16, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#1A8CFF' },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryCheck: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(0, 229, 184, 0.16)', borderWidth: 1, borderColor: Palette.mint },
  summaryLine: { marginTop: 10, color: '#C5DFF8', fontFamily: FontFamily.regular, fontSize: 13 },
  summaryTrack: { marginTop: 14 },
  githubCard: { marginTop: 16, minHeight: 68, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, borderColor: '#145C9A', backgroundColor: '#06284F' },
  githubIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#0A3A66' },
  githubCopy: { flex: 1, minWidth: 0 },
  githubTitle: { color: '#E6F4FF', fontFamily: FontFamily.semibold, fontSize: 13 },
  githubText: { marginTop: 3, color: '#8EBBE6', fontFamily: FontFamily.regular, fontSize: 11 },
  connect: { color: Palette.cyan, fontFamily: FontFamily.semibold, fontSize: 12 },
});
