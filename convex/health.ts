import type { MutationCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';

const DAY = 24 * 60 * 60 * 1000;
const healthRank = { active: 3, slowing: 2, stalled: 1, dying: 0 } as const;

export const localDateKey = (timestamp = Date.now()) => new Date(timestamp).toISOString().slice(0, 10);

export async function recomputeProjectHealth(ctx: MutationCtx, projectId: Id<'projects'>, progress?: number) {
  const project = await ctx.db.get(projectId);
  if (!project) return null;
  const now = Date.now();
  const features = await ctx.db.query('features').withIndex('by_project', (q) => q.eq('projectId', projectId)).collect();
  const completed = features.filter((feature) => feature.bucket === 'v1' && feature.state === 'completed');
  const latestFeature = completed.reduce<number | null>((latest, feature) => Math.max(latest ?? 0, feature.completedAt ?? feature.updatedAt), null);
  const lastActivity = Math.max(project.lastActivityAt ?? 0, latestFeature ?? 0, project.createdAt);
  const days = Math.floor((now - lastActivity) / DAY);
  let score = 100;
  const reasons: string[] = [];
  if (days > 60) { score -= 55; reasons.push('No meaningful activity for more than 60 days'); }
  else if (days >= 31) { score -= 35; reasons.push('No meaningful activity for 31 days'); }
  else if (days >= 15) { score -= 15; reasons.push('No meaningful activity for 15 days'); }
  else if (days >= 8) { score -= 5; reasons.push('No meaningful activity for 8 days'); }
  if (!latestFeature || now - latestFeature > 14 * DAY) { score -= 10; reasons.push('No v1 feature completed in 14 days'); }
  const effectiveProgress = progress ?? project.progress;
  if (project.deadline) {
    const deadline = new Date(project.deadline).getTime();
    if (Number.isFinite(deadline) && deadline >= now && deadline - now <= 14 * DAY && effectiveProgress < 80) { score -= 10; reasons.push('Deadline is within 14 days and progress is below 80%'); }
  }
  if (latestFeature && now - latestFeature <= 7 * DAY) { score += 10; reasons.push('A v1 feature was completed this week'); }
  score = Math.max(0, Math.min(100, score));
  const health: Doc<'projects'>['health'] = days > 30 || score < 25 ? 'dying' : days >= 15 || score < 50 ? 'stalled' : days >= 8 || score < 75 ? 'slowing' : 'active';
  if (!reasons.length) reasons.push('Recent meaningful activity is keeping this project on track');
  await ctx.db.patch(projectId, { health, healthScore: score, healthReasons: reasons, updatedAt: now });
  if (project.health !== health) {
    await ctx.db.insert('healthEvents', { ownerId: project.ownerId, projectId, previous: project.health, current: health, score, reasons, evaluatedAt: now });
    if (healthRank[health] < healthRank[project.health]) await createNotification(ctx, { ownerId: project.ownerId, projectId, type: 'healthChanged', title: `${project.name} needs attention`, body: reasons[0], deepLink: `/project/${projectId}` });
  }
  return { health, score, reasons };
}

export async function createNotification(ctx: MutationCtx, input: { ownerId: Id<'users'>; projectId?: Id<'projects'>; type: 'finishLine' | 'healthChanged' | 'dailyNudge'; title: string; body: string; deepLink?: string }) {
  const dateKey = localDateKey();
  const alreadySent = input.projectId ? await ctx.db.query('notifications').withIndex('by_project', (q) => q.eq('projectId', input.projectId!)).collect() : [];
  if (alreadySent.some((item) => item.type === input.type && item.dateKey === dateKey)) return null;
  return await ctx.db.insert('notifications', { ...input, dateKey, createdAt: Date.now() });
}
