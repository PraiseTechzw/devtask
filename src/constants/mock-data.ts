export const projects = [
  { id: 'myapp', name: 'MyApp', progress: 68, health: 'Active', detail: '2h ago' },
  { id: 'portfolio', name: 'Portfolio', progress: 42, health: 'Slowing', detail: 'Yesterday' },
  { id: 'learnrust', name: 'LearnRust', progress: 23, health: 'Stalled', detail: '3 days ago' },
  { id: 'devtask', name: 'DevTask', progress: 15, health: 'Active', detail: 'Just now' },
] as const;

export const features = [
  ['Setup auth flow', 'small'], ['Build project list', 'medium'], ['Create settings', 'small'], ['Add onboarding', 'medium'], ['Connect analytics', 'small'],
] as const;
