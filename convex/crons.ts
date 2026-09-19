import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();
crons.interval('recompute project health', { hours: 6 }, internal.projects.recomputeAllHealth);

export default crons;
