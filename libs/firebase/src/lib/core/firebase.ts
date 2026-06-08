import { initializeApp, getApps, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Returns the singleton Firebase Admin app instance, initializing it on first call.
 *
 * Required environment variables:
 *   GOOGLE_APPLICATION_CREDENTIALS - path to the service account JSON file
 *   FIREBASE_PROJECT_ID            - Firebase project ID
 */
export const getFirebaseApp = (): App => {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env['FIREBASE_PROJECT_ID'],
  });
};

/**
 * Returns a Firestore database instance connected to the Firebase project.
 * Safe to call multiple times — Firebase deduplicates internally.
 */
export const getDb = (): Firestore => getFirestore(getFirebaseApp());
