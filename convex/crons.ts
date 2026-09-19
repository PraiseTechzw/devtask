import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();
crons.interval('recompute project health', { hours: 6 }, internal.projects.recomputeAllHealth);
crons.interval('sync imported GitHub repositories', { hours: 6 }, internal.github.syncAll);

export default crons;
