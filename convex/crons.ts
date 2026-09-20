import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();
crons.interval('recompute project health', { hours: 6 }, internal.projects.recomputeAllHealth);
crons.interval('sync imported GitHub repositories', { hours: 6 }, internal.github.syncAll);
crons.interval('run due GitHub sync retries', { minutes: 5 }, internal.github.runDueRetries);

export default crons;
