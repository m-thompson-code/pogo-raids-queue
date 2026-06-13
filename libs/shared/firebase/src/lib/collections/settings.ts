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
