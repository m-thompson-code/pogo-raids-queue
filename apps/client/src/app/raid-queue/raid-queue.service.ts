import { Injectable, OnDestroy } from '@angular/core';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  setDoc,
  writeBatch,
  deleteField,
  type Unsubscribe,
} from 'firebase/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface QueueEntry {
  twitchUserId: string;
  twitchUsername: string;
  pogoUsername: string;
  isSubscriber: boolean;
  isVip: boolean;
  status: 'joined' | 'invited' | 'copied';
  joinedAt: Date;
  createdAt: Date | null;
  hasCreatedAt: boolean;
}

@Injectable({ providedIn: 'root' })
export class RaidQueueService implements OnDestroy {
  private readonly queue$ = new BehaviorSubject<QueueEntry[] | null>(null);
  private readonly timedOutQueue$ = new BehaviorSubject<QueueEntry[] | null>(null);
  private queueUnsubscribe: Unsubscribe | null = null;
  private timedOutQueueUnsubscribe: Unsubscribe | null = null;

  constructor() {
    const app =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp(environment.firebase);

    const db = getFirestore(app);
    const q = query(collection(db, 'raidQueue'), orderBy('joinedAt', 'asc'));

    // Real-time listener — updates the queue whenever Firestore changes
    this.queueUnsubscribe = onSnapshot(q, (snapshot) => {
      const entries: QueueEntry[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        const hasCreatedAt = Object.hasOwn(data, 'createdAt');
        return {
          twitchUserId: data['twitchUserId'] as string,
          twitchUsername: data['twitchUsername'] as string,
          pogoUsername: data['pogoUsername'] as string,
          isSubscriber: data['isSubscriber'] as boolean,
          isVip: data['isVip'] as boolean,
          status: (data['status'] as 'joined' | 'invited' | 'copied') ?? 'joined',
          joinedAt: data['joinedAt']?.toDate?.() ?? new Date(),
          createdAt: data['createdAt']?.toDate?.() ?? null,
          hasCreatedAt,
        };
      });
      this.queue$.next(entries);
    });

    const timedOutQuery = query(collection(db, 'timedOutQueue'), orderBy('joinedAt', 'asc'));
    this.timedOutQueueUnsubscribe = onSnapshot(timedOutQuery, (snapshot) => {
      const entries: QueueEntry[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        const hasCreatedAt = Object.hasOwn(data, 'createdAt');
        return {
          twitchUserId: data['twitchUserId'] as string,
          twitchUsername: data['twitchUsername'] as string,
          pogoUsername: data['pogoUsername'] as string,
          isSubscriber: data['isSubscriber'] as boolean,
          isVip: data['isVip'] as boolean,
          status: (data['status'] as 'joined' | 'invited' | 'copied') ?? 'joined',
          joinedAt: data['joinedAt']?.toDate?.() ?? new Date(),
          createdAt: data['createdAt']?.toDate?.() ?? null,
          hasCreatedAt,
        };
      });
      this.timedOutQueue$.next(entries);
    });
  }

  /** Observable stream of queue entries ordered by join time, null while loading */
  getQueue(): Observable<QueueEntry[] | null> {
    return this.queue$.asObservable();
  }

  /** Observable stream of timed-out queue entries ordered by join time, null while loading */
  getTimedOutQueue(): Observable<QueueEntry[] | null> {
    return this.timedOutQueue$.asObservable();
  }

  /** Removes a single entry from the raidQueue collection by twitchUserId */
  async removeEntry(twitchUserId: string): Promise<void> {
    const db = getFirestore();
    await deleteDoc(doc(db, 'raidQueue', twitchUserId));
  }

  /** Updates the status of a group of queue entries in a single batch write */
  async updateGroupStatus(
    twitchUserIds: string[],
    status: 'joined' | 'invited' | 'copied',
  ): Promise<void> {
    const db = getFirestore();
    const batch = writeBatch(db);
    for (const twitchUserId of twitchUserIds) {
      batch.update(doc(db, 'raidQueue', twitchUserId), { status });
    }
    await batch.commit();
  }

  /** Adds a manual entry (no Twitch account) by Pokémon GO username */
  async addManual(pogoUsername: string): Promise<void> {
    const db = getFirestore();
    const id = `manual_${pogoUsername.toLowerCase()}`;
    await setDoc(doc(db, 'raidQueue', id), {
      twitchUserId: id,
      twitchUsername: '',
      pogoUsername,
      isSubscriber: false,
      isVip: false,
      status: 'joined',
      joinedAt: new Date(),
    });
  }

  /** Clears timeout and moves user from timedOutQueue back to raidQueue. */
  async releaseTimedOutEntry(entry: QueueEntry): Promise<void> {
    const db = getFirestore();
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', entry.twitchUserId);
    const timedOutRef = doc(db, 'timedOutQueue', entry.twitchUserId);
    const queueRef = doc(db, 'raidQueue', entry.twitchUserId);

    batch.set(userRef, { timedOutAt: deleteField() }, { merge: true });
    batch.set(queueRef, {
      twitchUserId: entry.twitchUserId,
      twitchUsername: entry.twitchUsername,
      pogoUsername: entry.pogoUsername,
      isSubscriber: entry.isSubscriber,
      isVip: entry.isVip,
      status: 'joined',
      joinedAt: new Date(),
      ...(entry.createdAt ? { createdAt: entry.createdAt } : {}),
    });
    batch.delete(timedOutRef);
    await batch.commit();
  }

  ngOnDestroy(): void {
    this.queueUnsubscribe?.();
    this.timedOutQueueUnsubscribe?.();
  }
}
