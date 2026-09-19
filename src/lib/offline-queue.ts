import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'devtask.offline-mutations.v1';

export type OfflineMutation = {
  id: string;
  operation: 'checklist.create' | 'checklist.toggle' | 'feature.create' | 'feature.toggle';
  payload: Record<string, string>;
  createdAt: number;
};

function isOfflineError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('network') || message.includes('fetch') || message.includes('offline') || message.includes('timeout') || message.includes('unable to reach');
}

async function readQueue() {
  const stored = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!stored) return [] as OfflineMutation[];
  try {
    return JSON.parse(stored) as OfflineMutation[];
  } catch {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    return [] as OfflineMutation[];
  }
}

async function writeQueue(queue: OfflineMutation[]) {
  if (!queue.length) {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(queue));
}

export async function queueMutation(operation: OfflineMutation['operation'], payload: Record<string, string>) {
  const queue = await readQueue();
  queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, operation, payload, createdAt: Date.now() });
  await writeQueue(queue);
}

export async function runOrQueue<T>(operation: OfflineMutation['operation'], payload: Record<string, string>, run: () => Promise<T>) {
  try {
    return { queued: false, value: await run() };
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    await queueMutation(operation, payload);
    return { queued: true, value: undefined };
  }
}

export async function replayQueuedMutations(dispatch: (item: OfflineMutation) => Promise<void>) {
  const queue = await readQueue();
  const remaining: OfflineMutation[] = [];
  for (const item of queue.sort((a, b) => a.createdAt - b.createdAt)) {
    try {
      await dispatch(item);
    } catch {
      remaining.push(item);
      break;
    }
  }
  await writeQueue(remaining);
  return { replayed: queue.length - remaining.length, remaining: remaining.length };
}

export async function getQueuedMutationCount() {
  return (await readQueue()).length;
}
