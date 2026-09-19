import { v } from 'convex/values';

import { mutation, type MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { requireCurrentUser } from './users';
import { createNotification, recomputeProjectHealth } from './health';

const weightValue = { small: 1, medium: 2, large: 3 } as const;
const weight = v.union(v.literal('small'), v.literal('medium'), v.literal('large'));
const bucket = v.union(v.literal('v1'), v.literal('backlog'));

async function updateProjectProgress(ctx: MutationCtx, projectId: Id<'projects'>) {
  const project = await ctx.db.get(projectId);
  if (!project) return { previousProgress: 0, progress: 0 };
  const features = await ctx.db.query('features').withIndex('by_project', (q) => q.eq('projectId', projectId)).collect();
  const v1Features = features.filter((feature) => feature.bucket === 'v1');
  const total = v1Features.reduce((sum, feature) => sum + weightValue[feature.weight], 0);
  const completed = v1Features.filter((feature) => feature.state === 'completed').reduce((sum, feature) => sum + weightValue[feature.weight], 0);
  const progress = total ? Math.round((completed / total) * 100) : 0;
  await ctx.db.patch(projectId, { progress, healthReasons: total ? [] : ['Define your features to unlock progress'], updatedAt: Date.now() });
  await recomputeProjectHealth(ctx, projectId, progress);
  return { previousProgress: project.progress, progress };
}

export const create = mutation({
  args: { projectId: v.id('projects'), title: v.string(), bucket, weight },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!user || !project || project.ownerId !== user._id) throw new Error('Project not found');
    const title = args.title.trim();
    if (!title || title.length > 120) throw new Error('Features must be 1–120 characters');
    const existing = await ctx.db.query('features').withIndex('by_project', (q) => q.eq('projectId', project._id)).collect();
    const now = Date.now();
    const featureId = await ctx.db.insert('features', { ownerId: user._id, projectId: project._id, title, bucket: args.bucket, weight: args.weight, state: 'open', order: existing.length, createdAt: now, updatedAt: now });
    await updateProjectProgress(ctx, project._id);
    return featureId;
  },
});

export const toggleComplete = mutation({
  args: { featureId: v.id('features') },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const feature = await ctx.db.get(args.featureId);
    if (!user || !feature || feature.ownerId !== user._id) throw new Error('Feature not found');
    const completed = feature.state !== 'completed';
    await ctx.db.patch(feature._id, { state: completed ? 'completed' : 'open', completedAt: completed ? Date.now() : undefined, updatedAt: Date.now() });
    const progress = await updateProjectProgress(ctx, feature.projectId);
    const project = await ctx.db.get(feature.projectId);
    if (completed && project && progress.previousProgress < 80 && progress.progress >= 80 && !project.finishPromptShownAt) {
      const now = Date.now();
      await ctx.db.patch(project._id, { finishPromptShownAt: now });
      await createNotification(ctx, { ownerId: user._id, projectId: project._id, type: 'finishLine', title: `${project.name} is ready for the finish line`, body: 'You are at 80%. Add testing, polish, documentation, and release checks.', deepLink: `/project/${project._id}` });
    }
  },
});

export const remove = mutation({
  args: { featureId: v.id('features') },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx);
    const feature = await ctx.db.get(args.featureId);
    if (!user || !feature || feature.ownerId !== user._id) throw new Error('Feature not found');
    await ctx.db.delete(feature._id);
    await updateProjectProgress(ctx, feature.projectId);
  },
});

export const update = mutation({
  args: { featureId: v.id('features'), title: v.optional(v.string()), bucket: v.optional(bucket), weight: v.optional(weight), order: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { user } = await requireCurrentUser(ctx); const feature = await ctx.db.get(args.featureId);
    if (!user || !feature || feature.ownerId !== user._id) throw new Error('Feature not found');
    const title = args.title?.trim(); if (title !== undefined && (!title || title.length > 120)) throw new Error('Features must be 1–120 characters');
    await ctx.db.patch(feature._id, { ...(title !== undefined ? { title } : {}), ...(args.bucket ? { bucket: args.bucket } : {}), ...(args.weight ? { weight: args.weight } : {}), ...(args.order !== undefined ? { order: args.order } : {}), updatedAt: Date.now() });
    await updateProjectProgress(ctx, feature.projectId);
  },
});
