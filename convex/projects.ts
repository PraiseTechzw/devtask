import { v } from 'convex/values';

import { internalMutation, mutation, query } from './_generated/server';
import { requireCurrentUser } from './users';
import { recomputeProjectHealth } from './health';

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
    const repositoryActivity = focusProject?.repositoryId ? repositories.find((repository) => repository.githubRepositoryId === focusProject.repositoryId) ?? null : null;
    return {
      projects: active,
      focusProject,
      nextFeature,
      nextFeatureEstimateMinutes: nextFeature ? ({ small: 15, medium: 30, large: 60 } as const)[nextFeature.weight] : null,
      repositoryActivity: repositoryActivity ? { availability: repositoryActivity.availability, lastSyncAt: repositoryActivity.lastSyncAt, syncError: repositoryActivity.syncError, latestCommitAt: repositoryActivity.latestCommitAt } : null,
      summary: {
        active: active.length,
        completed: projects.filter((project) => project.state === 'completed').length,
        slowing: active.filter((project) => project.health === 'slowing' || project.health === 'stalled' || project.health === 'dying').length,
      },
    };
  },
});

export const analytics = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) return null;
    const projects = await ctx.db.query('projects').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    const allFeatures = await Promise.all(projects.map((project) => ctx.db.query('features').withIndex('by_project', (q) => q.eq('projectId', project._id)).collect()));
    const features = allFeatures.flat();
    const completedFeatures = features.filter((feature) => feature.state === 'completed');
    const activeProjects = projects.filter((project) => project.state === 'active');
    const connection = await ctx.db.query('githubConnections').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).unique();
    return {
      activeProjects,
      summary: {
        projectsFinished: projects.filter((project) => project.state === 'completed').length,
        featuresDone: completedFeatures.length,
        featuresOpen: features.filter((feature) => feature.bucket === 'v1' && feature.state === 'open').length,
        averageProgress: activeProjects.length ? Math.round(activeProjects.reduce((sum, project) => sum + project.progress, 0) / activeProjects.length) : 0,
        connectedToGitHub: connection?.state === 'connected',
      },
    };
  },
});

export const get = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerId !== user?._id) return null;
    const features = await ctx.db.query('features').withIndex('by_project', (q) => q.eq('projectId', project._id)).collect();
    return { project, features: features.sort((a, b) => a.order - b.order) };
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
    return await ctx.db.insert('projects', { ownerId: user._id, name, deadline: args.deadline, repositoryId, repositoryName, repositoryUrl, state: 'active', focus: !hasFocus, progress: 0, health: 'active', healthScore: 100, healthReasons: ['Define your features to unlock progress'], createdAt: now, updatedAt: now });
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
