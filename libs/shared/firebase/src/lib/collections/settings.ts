import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../core/firebase.js';

/**
 * Writes a new server timestamp to `settings/ui.regirice`.
 * The Angular client listens to this document and triggers the
 * Regirice animation whenever the timestamp changes.
 */
export const triggerRegirice = async (): Promise<void> => {
  await getDb()
    .collection('settings')
    .doc('ui')
    .set({ regirice: FieldValue.serverTimestamp() }, { merge: true });
};
