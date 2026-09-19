import { useMutation } from 'convex/react';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { api } from '../../convex/_generated/api';
import { replayQueuedMutations, type OfflineMutation } from '@/lib/offline-queue';

export function OfflineMutationService() {
  const createChecklist = useMutation(api.checklist.create);
  const toggleChecklist = useMutation(api.checklist.toggle);
  const createFeature = useMutation(api.features.create);
  const toggleFeature = useMutation(api.features.toggleComplete);

  useEffect(() => {
    const replay = async () => {
      await replayQueuedMutations(async (item: OfflineMutation) => {
        if (item.operation === 'checklist.create') {
          await createChecklist({ title: item.payload.title, localDate: item.payload.localDate });
        } else if (item.operation === 'checklist.toggle') {
          await toggleChecklist({ itemId: item.payload.itemId as never });
        } else if (item.operation === 'feature.create') {
          await createFeature({ projectId: item.payload.projectId as never, title: item.payload.title, bucket: 'v1', weight: 'small' });
        } else {
          await toggleFeature({ featureId: item.payload.featureId as never });
        }
      });
    };
    void replay();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void replay();
    });
    return () => subscription.remove();
  }, [createChecklist, toggleChecklist, createFeature, toggleFeature]);

  return null;
}
