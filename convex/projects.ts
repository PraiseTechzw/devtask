import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { requireCurrentUser } from './users';

const projectState = v.union(v.literal('active'), v.literal('archived'), v.literal('completed'));

export const list = query({
  args: { state: v.optional(projectState) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) return [];
    const projects = args.state
      ? await ctx.db.query('projects').withIndex('by_owner_and_state', (q) => q.eq('ownerId', user._id).eq('state', args.state!)).collect()
      : await ctx.db.query('projects').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    return projects.sort((a, b) => Number(b.focus) - Number(a.focus) || b.updatedAt - a.updatedAt);
  },
});

export const home = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireCurrentUser(ctx);
    if (!user) return null;
    const projects = await ctx.db.query('projects').withIndex('by_owner', (q) => q.eq('ownerId', user._id)).collect();
    const active = projects.filter((project) => project.state === 'active').sort((a, b) => Number(b.focus) - Number(a.focus) || b.updatedAt - a.updatedAt);
    const focusProject = active.find((project) => project.focus) ?? active[0] ?? null;
    const focusFeatures = focusProject ? await ctx.db.query('features').withIndex('by_project', (q) => q.eq('projectId', focusProject._id)).collect() : [];
    const nextFeature = focusFeatures.filter((feature) => feature.bucket === 'v1' && feature.state === 'open').sort((a, b) => a.order - b.order)[0] ?? null;
    return {
      projects: active,
      focusProject,
      nextFeature,
      summary: {
        active: active.length,
        completed: projects.filter((project) => project.state === 'completed').length,
        slowing: active.filter((project) => project.health === 'slowing' || project.health === 'stalled' || project.health === 'dying').length,
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
    const now = Date.now();
    const hasFocus = (await ctx.db.query('projects').withIndex('by_owner_and_state', (q) => q.eq('ownerId', user._id).eq('state', 'active')).collect()).some((project) => project.focus);
    return await ctx.db.insert('projects', { ownerId: user._id, name, deadline: args.deadline, repositoryId: args.repositoryId, repositoryName: args.repositoryName, repositoryUrl: args.repositoryUrl, state: 'active', focus: !hasFocus, progress: 0, health: 'active', healthReasons: ['Define your features to unlock progress'], createdAt: now, updatedAt: now });
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
  },
});
