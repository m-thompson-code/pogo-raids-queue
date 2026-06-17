import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../core/firebase.js';

/**
 * Increments the `regirice` counter in `settings/ui`.
 * The Angular client listens to this document and triggers the
 * Regirice animation whenever the counter changes.
 */
export const triggerRegirice = async (): Promise<void> => {
  await getDb()
    .collection('settings')
    .doc('ui')
    .set({ regirice: FieldValue.increment(1) }, { merge: true });
};

/** Sets strict mode flag in settings/ui for UI-controlled bot behavior. */
export const setUiStrictMode = async (enabled: boolean): Promise<void> => {
  await getDb()
    .collection('settings')
    .doc('ui')
    .set({ strictMode: enabled }, { merge: true });
};

/** Subscribes to settings/ui strict-mode changes. */
export const subscribeToUiSettings = (
  callback: (settings: { strictMode?: boolean }) => void,
  onError?: (error: Error) => void,
): (() => void) => {
  return getDb()
    .collection('settings')
    .doc('ui')
    .onSnapshot((snapshot) => {
      const strictMode = snapshot.data()?.['strictMode'];
      callback({ strictMode: typeof strictMode === 'boolean' ? strictMode : undefined });
    }, onError);
};
