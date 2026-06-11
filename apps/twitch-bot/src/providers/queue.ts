import { FirestoreQueueProvider } from './firestore-queue-provider.js';

/**
 * Singleton queue provider instance.
 * All command handlers import from here instead of receiving a provider argument.
 */
export const queue = new FirestoreQueueProvider();
