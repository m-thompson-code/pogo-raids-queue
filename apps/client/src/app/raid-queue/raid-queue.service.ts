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
}

@Injectable({ providedIn: 'root' })
export class RaidQueueService implements OnDestroy {
  private readonly queue$ = new BehaviorSubject<QueueEntry[] | null>(null);
  private unsubscribe: Unsubscribe | null = null;

  constructor() {
    const app =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp(environment.firebase);

    const db = getFirestore(app);
    const q = query(collection(db, 'raidQueue'), orderBy('joinedAt', 'asc'));

    // Real-time listener — updates the queue whenever Firestore changes
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      const entries: QueueEntry[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          twitchUserId: data['twitchUserId'] as string,
          twitchUsername: data['twitchUsername'] as string,
          pogoUsername: data['pogoUsername'] as string,
          isSubscriber: data['isSubscriber'] as boolean,
          isVip: data['isVip'] as boolean,
          status: (data['status'] as 'joined' | 'invited' | 'copied') ?? 'joined',
          joinedAt: data['joinedAt']?.toDate?.() ?? new Date(),
        };
      });
      this.queue$.next(entries);
    });
  }

  /** Observable stream of queue entries ordered by join time, null while loading */
  getQueue(): Observable<QueueEntry[] | null> {
    return this.queue$.asObservable();
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

  ngOnDestroy(): void {
    this.unsubscribe?.();
  }
}
