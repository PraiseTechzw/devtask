import { v } from 'convex/values';

import { internal } from './_generated/api';
import { internalMutation, mutation, query, type MutationCtx } from './_generated/server';
import { requireCurrentUser } from './users';
import { recomputeProjectHealth } from './health';
import type { Id } from './_generated/dataModel';

async function scheduleRepositorySync(ctx: MutationCtx, ownerId: Id<'users'>, githubRepositoryId?: string) {
  if (!githubRepositoryId) return;
  const repository = await ctx.db.query('repositories').withIndex('by_owner_and_github_id', (q) => q.eq('ownerId', ownerId).eq('githubRepositoryId', githubRepositoryId)).unique();
  if (repository) await ctx.scheduler.runAfter(0, internal.github.runSyncRepository, { repositoryId: repository._id });
}

const projectState = v.union(v.literal('active'), v.literal('archived'), v.literal('completed'));

export const list = query({
  args: { state: v.optional(projectState) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) return [];
    const projects = args.state
      ? await ctx.db.query('projects').withIndex('by_owner_and_state', (q) => q.eq('ownerId', user._id).eq('state', args.state!)).collect()
      : await ctx.db.query('projects').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    const urgency = { dying: 0, stalled: 1, slowing: 2, active: 3 } as const;
    return projects.sort((a, b) => Number(b.focus) - Number(a.focus) || urgency[a.health] - urgency[b.health] || a.updatedAt - b.updatedAt);
  },
});

export const home = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) return null;
    const projects = await ctx.db.query('projects').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    const active = projects.filter((project) => project.state === 'active');
    const urgency = { dying: 0, stalled: 1, slowing: 2, active: 3 } as const;
    const recommendation = [...active].sort((a, b) => {
      const healthDifference = urgency[a.health] - urgency[b.health];
      if (healthDifference) return healthDifference;
      const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
      const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
      if (aDeadline !== bDeadline) return aDeadline - bDeadline;
      if (a.progress !== b.progress) return a.progress - b.progress;
      return b.createdAt - a.createdAt;
    });
    const focusProject = active.find((project) => project.focus) ?? recommendation[0] ?? null;
    const focusFeatures = focusProject ? await ctx.db.query('features').withIndex('by_project', (q) => q.eq('projectId', focusProject._id)).collect() : [];
    const weightRank = { small: 0, medium: 1, large: 2 } as const;
    const nextFeature = focusFeatures.filter((feature) => feature.bucket === 'v1' && feature.state === 'open').sort((a, b) => weightRank[a.weight] - weightRank[b.weight] || a.order - b.order)[0] ?? null;
    const repositories = await ctx.db.query('repositories').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    const connection = await ctx.db.query('githubConnections').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).unique();
    const repositoryActivity = focusProject
      ? repositories.find((repository) => repository.githubRepositoryId === focusProject.repositoryId || (focusProject.repositoryName ? repository.fullName === focusProject.repositoryName : false)) ?? null
      : null;
    return {
      projects: active,
      focusProject,
      nextFeature,
      nextFeatureEstimateMinutes: nextFeature ? ({ small: 15, medium: 30, large: 60 } as const)[nextFeature.weight] : null,
      githubConnected: connection?.state === 'connected',
      repositoryActivity: repositoryActivity ? { availability: repositoryActivity.availability ?? 'available', fullName: repositoryActivity.fullName, lastSyncAt: repositoryActivity.lastSyncAt, syncError: repositoryActivity.syncError, latestCommitAt: repositoryActivity.latestCommitAt } : null,
      summary: {
        active: active.length,
        completed: projects.filter((project) => project.state === 'completed').length,
        slowing: active.filter((project) => project.health === 'slowing' || project.health === 'stalled' || project.health === 'dying').length,
      },
    };
  },
});

export const analytics = query({
  args: { period: v.optional(v.union(v.literal('week'), v.literal('month'), v.literal('year'))) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) return null;
    const period = args.period ?? 'week';
    const periodMs = period === 'year' ? 365 * 24 * 60 * 60 * 1000 : period === 'month' ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const periodStart = Date.now() - periodMs;
    const projects = await ctx.db.query('projects').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    const allFeatures = await Promise.all(projects.map((project) => ctx.db.query('features').withIndex('by_project', (q) => q.eq('projectId', project._id)).collect()));
    const features = allFeatures.flat();
    const completedFeatures = features.filter((feature) => feature.state === 'completed');
    const activeProjects = projects.filter((project) => project.state === 'active');
    const connection = await ctx.db.query('githubConnections').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).unique();
    const repositories = await ctx.db.query('repositories').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    const imported = repositories.filter((repository) => projects.some((project) => project.repositoryId === repository.githubRepositoryId && project.state !== 'archived'));
    const snapshots = (await Promise.all(imported.map((repository) => ctx.db.query('activitySnapshots').withIndex('by_repository', (q) => q.eq('repositoryId', repository._id)).collect()))).flat();
    const periodSnapshots = snapshots.filter((snapshot) => snapshot.createdAt >= periodStart);
    const dayMap = new Map<string, number>();
    for (const snapshot of periodSnapshots) dayMap.set(snapshot.sampledDate, (dayMap.get(snapshot.sampledDate) ?? 0) + snapshot.recentCommitCount);
    const lastSyncAt = imported.reduce<number | undefined>((latest, repository) => repository.lastSyncAt && (!latest || repository.lastSyncAt > latest) ? repository.lastSyncAt : latest, connection?.lastSyncAt);
    const v1Features = features.filter((feature) => feature.bucket === 'v1');
    const v1Completed = v1Features.filter((feature) => feature.state === 'completed');
    const v1Open = v1Features.filter((feature) => feature.state === 'open');
    const chart = buildPerformanceChart(period, v1Completed, user.timeZone);
    const heatmap = buildCompletionHeatmap(v1Completed, v1Open, user.timeZone);
    const featuresDoneInPeriod = completedFeatures.filter((feature) => (feature.completedAt ?? feature.updatedAt) >= periodStart).length;
    const projectsUpdated = projects.filter((project) => project.updatedAt >= periodStart && project.state !== 'archived').length;
    return {
      activeProjects,
      chart,
      heatmap,
      metrics: {
        totalTasks: v1Features.length,
        completed: v1Completed.length,
        inProgress: v1Open.length,
      },
      periodSummary: {
        projectsUpdated,
        tasksCompleted: featuresDoneInPeriod,
        completionRate: v1Features.length ? Math.round((v1Completed.length / v1Features.length) * 100) : 0,
      },
      summary: {
        projectsFinished: projects.filter((project) => project.state === 'completed').length,
        featuresDone: completedFeatures.length,
        featuresDoneInPeriod,
        featuresOpen: v1Open.length,
        averageProgress: activeProjects.length ? Math.round(activeProjects.reduce((sum, project) => sum + project.progress, 0) / activeProjects.length) : 0,
        connectedToGitHub: connection?.state === 'connected',
      },
      github: {
        connected: connection?.state === 'connected',
        state: connection?.state ?? null,
        lastSyncAt,
        stale: Boolean(lastSyncAt && Date.now() - lastSyncAt > 24 * 60 * 60 * 1000) || (connection?.state === 'connected' && imported.length > 0 && !lastSyncAt),
        totals: {
          commits: imported.reduce((sum, repository) => sum + (repository.recentCommitCount ?? 0), 0),
          issues: imported.reduce((sum, repository) => sum + (repository.openIssueCount ?? 0), 0),
          pullRequests: imported.reduce((sum, repository) => sum + (repository.openPullRequestCount ?? 0), 0),
        },
        repositories: imported.map((repository) => ({
          _id: repository._id,
          fullName: repository.fullName,
          availability: repository.availability ?? 'available',
          lastSyncAt: repository.lastSyncAt,
          latestCommitAt: repository.latestCommitAt,
          recentCommitCount: repository.recentCommitCount ?? 0,
          openIssueCount: repository.openIssueCount ?? 0,
          openPullRequestCount: repository.openPullRequestCount ?? 0,
          syncError: repository.syncError,
          projectName: projects.find((project) => project.repositoryId === repository.githubRepositoryId)?.name,
        })),
        activity: [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, commits]) => ({ date, commits })),
      },
    };
  },
});

export const get = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!user || !project || project.ownerId !== user._id) return null;
    const features = await ctx.db.query('features').withIndex('by_project', (q) => q.eq('projectId', project._id)).collect();
    const repositories = await ctx.db.query('repositories').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    const repository = project.repositoryId
      ? repositories.find((item) => item.githubRepositoryId === project.repositoryId || item.fullName === project.repositoryName) ?? null
      : null;
    return {
      project,
      features: features.sort((a, b) => a.order - b.order),
      githubActivity: repository ? {
        _id: repository._id,
        fullName: repository.fullName,
        availability: repository.availability ?? 'available',
        lastSyncAt: repository.lastSyncAt,
        latestCommitAt: repository.latestCommitAt,
        recentCommitCount: repository.recentCommitCount ?? 0,
        openIssueCount: repository.openIssueCount ?? 0,
        openPullRequestCount: repository.openPullRequestCount ?? 0,
        syncError: repository.syncError,
      } : null,
    };
  },
});

export const create = mutation({
  args: { name: v.string(), deadline: v.optional(v.string()), repositoryId: v.optional(v.string()), repositoryName: v.optional(v.string()), repositoryUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) throw new Error('Create your profile before adding a project');
    const name = args.name.trim();
    if (name.length < 1 || name.length > 80) throw new Error('Project names must be 1–80 characters');
    const linkedRepository = args.repositoryId ? undefined : args.repositoryUrl ? (await ctx.db.query('repositories').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect()).find((repository) => repository.url === args.repositoryUrl) : undefined;
    const repositoryId = args.repositoryId ?? linkedRepository?.githubRepositoryId;
    const repositoryName = args.repositoryName ?? linkedRepository?.fullName;
    const repositoryUrl = args.repositoryUrl ?? linkedRepository?.url;
    const now = Date.now();
    const hasFocus = (await ctx.db.query('projects').withIndex('by_owner_and_state', (q) => q.eq('ownerId', user._id).eq('state', 'active')).collect()).some((project) => project.focus);
    const projectId = await ctx.db.insert('projects', { ownerId: user._id, name, deadline: args.deadline, repositoryId, repositoryName, repositoryUrl, state: 'active', focus: !hasFocus, progress: 0, health: 'active', healthScore: 100, healthReasons: ['Define your features to unlock progress'], createdAt: now, updatedAt: now });
    await scheduleRepositorySync(ctx, user._id, repositoryId);
    return projectId;
  },
});

export const setFocus = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!user || !project || project.ownerId !== user._id || project.state !== 'active') throw new Error('Project not found');
    const activeProjects = await ctx.db.query('projects').withIndex('by_owner_and_state', (q) => q.eq('ownerId', user._id).eq('state', 'active')).collect();
    await Promise.all(activeProjects.filter((item) => item.focus).map((item) => ctx.db.patch(item._id, { focus: false, updatedAt: Date.now() })));
    await ctx.db.patch(project._id, { focus: true, updatedAt: Date.now() });
  },
});

export const setState = mutation({
  args: { projectId: v.id('projects'), state: projectState },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!user || !project || project.ownerId !== user._id) throw new Error('Project not found');
    const now = Date.now();
    await ctx.db.patch(project._id, { state: args.state, focus: args.state === 'active' ? project.focus : false, completedAt: args.state === 'completed' ? now : undefined, archivedAt: args.state === 'archived' ? now : undefined, updatedAt: now });
    if (args.state === 'active') await recomputeProjectHealth(ctx, project._id);
  },
});

export const recomputeAllHealth = internalMutation({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query('projects').collect();
    await Promise.all(projects.filter((project) => project.state === 'active').map((project) => recomputeProjectHealth(ctx, project._id)));
  },
});

export const update = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.optional(v.string()),
    deadline: v.optional(v.string()),
    repositoryId: v.optional(v.string()),
    repositoryName: v.optional(v.string()),
    repositoryUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!user || !project || project.ownerId !== user._id) throw new Error('Project not found');
    const name = args.name?.trim();
    if (name !== undefined && (!name || name.length > 80)) throw new Error('Project names must be 1–80 characters');
    const repositoryId = args.repositoryId;
    if (repositoryId) {
      const duplicate = await ctx.db.query('projects').withIndex('by_owner_and_repository', (q) => q.eq('ownerId', user._id).eq('repositoryId', repositoryId)).collect();
      if (duplicate.some((item) => item._id !== project._id && item.state !== 'archived')) throw new Error('That repository is already linked to another project');
    }
    await ctx.db.patch(project._id, {
      ...(name !== undefined ? { name } : {}),
      ...(args.deadline !== undefined ? { deadline: args.deadline || undefined } : {}),
      ...(args.repositoryId !== undefined ? { repositoryId: args.repositoryId || undefined, repositoryName: args.repositoryId ? args.repositoryName || undefined : undefined, repositoryUrl: args.repositoryId ? args.repositoryUrl || undefined : undefined } : {}),
      updatedAt: Date.now(),
    });
    await recomputeProjectHealth(ctx, project._id);
    await scheduleRepositorySync(ctx, user._id, args.repositoryId !== undefined ? args.repositoryId || undefined : project.repositoryId);
    return project._id;
  },
});

export const setFocusByRecommendation = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) return null;
    const active = await ctx.db.query('projects').withIndex('by_owner_and_state', (q) => q.eq('ownerId', user._id).eq('state', 'active')).collect();
    const urgency = { dying: 0, stalled: 1, slowing: 2, active: 3 } as const;
    const candidate = active.sort((a, b) => urgency[a.health] - urgency[b.health] || (a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY) - (b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY) || a.progress - b.progress || b.createdAt - a.createdAt)[0];
    if (!candidate) return null;
    await Promise.all(active.map((project) => ctx.db.patch(project._id, { focus: project._id === candidate._id, updatedAt: Date.now() })));
    return candidate._id;
  },
});

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function zonedParts(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(new Date(timestamp));
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return { year: Number(read('year')), month: Number(read('month')), day: Number(read('day')), weekday: read('weekday') };
}

function weekdayIndex(weekday: string) {
  return Math.max(0, WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number]));
}

function utcDay(year: number, month: number, day: number) {
  return Date.UTC(year, month - 1, day);
}

function buildPerformanceChart(period: 'week' | 'month' | 'year', completed: Array<{ completedAt?: number; updatedAt: number }>, timeZone: string) {
  const today = zonedParts(Date.now(), timeZone);
  const buckets = period === 'year'
    ? MONTHS.map((label, index) => ({ key: `${today.year}-${index + 1}`, label, start: Date.UTC(today.year, index, 1), end: Date.UTC(today.year, index + 1, 1) }))
    : period === 'month'
      ? Array.from({ length: 4 }, (_, week) => {
        const start = utcDay(today.year, today.month, 1 + week * 7);
        const end = week === 3 ? Date.UTC(today.year, today.month, 1) : utcDay(today.year, today.month, 1 + (week + 1) * 7);
        return { key: `w${week + 1}`, label: `W${week + 1}`, start, end };
      })
      : WEEKDAYS.map((label, index) => {
        const monday = utcDay(today.year, today.month, today.day) - weekdayIndex(today.weekday) * 24 * 60 * 60 * 1000;
        const start = monday + index * 24 * 60 * 60 * 1000;
        return { key: label, label, start, end: start + 24 * 60 * 60 * 1000 };
      });
  const counts = buckets.map((bucket) => completed.filter((feature) => {
    const at = feature.completedAt ?? feature.updatedAt;
    return at >= bucket.start && at < bucket.end;
  }).length);
  const peak = Math.max(...counts, 1);
  return buckets.map((bucket, index) => ({ label: bucket.label, value: Math.round((counts[index] / peak) * 100), count: counts[index] }));
}

function buildCompletionHeatmap(completed: Array<{ completedAt?: number; updatedAt: number }>, open: Array<{ createdAt: number }>, timeZone: string) {
  const columns = 18;
  return WEEKDAYS.map((day, index) => {
    const completedCount = completed.filter((feature) => weekdayIndex(zonedParts(feature.completedAt ?? feature.updatedAt, timeZone).weekday) === index).length;
    const pendingCount = open.filter((feature) => weekdayIndex(zonedParts(feature.createdAt, timeZone).weekday) === index).length;
    const cells = Array.from({ length: columns }, (_, cell) => {
      if (cell < completedCount) return 'completed' as const;
      if (cell < completedCount + pendingCount) return 'pending' as const;
      return 'empty' as const;
    });
    return { day, cells };
  });
}
