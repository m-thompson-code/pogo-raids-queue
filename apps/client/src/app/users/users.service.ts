import { Injectable } from '@angular/core';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData,
  type OrderByDirection,
} from 'firebase/firestore';
import { from, type Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export const PAGE_SIZE = 1;

export interface RaidUser {
  twitchUserId: string;
  twitchUsername: string;
  pogoUsername: string;
  isSubscriber: boolean;
  isVip: boolean;
  lastRaided: Date;
  raidCount: number;
}

export interface UsersPage {
  users: RaidUser[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly db;

  constructor() {
    const app =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp(environment.firebase);
    this.db = getFirestore(app);
  }

  getUserCount(): Observable<number> {
    return from(getCountFromServer(collection(this.db, 'users'))).pipe(
      map((snap) => snap.data().count)
    );
  }

  getPage(
    sortField: string,
    sortDir: OrderByDirection,
    cursor: QueryDocumentSnapshot<DocumentData> | null
  ): Observable<UsersPage> {
    const ref = collection(this.db, 'users');
    const q = cursor
      ? query(ref, orderBy(sortField, sortDir), startAfter(cursor), limit(PAGE_SIZE))
      : query(ref, orderBy(sortField, sortDir), limit(PAGE_SIZE));
    return from(getDocs(q)).pipe(
      map((snapshot) => ({
        users: snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            twitchUserId: data['twitchUserId'] as string,
            twitchUsername: data['twitchUsername'] as string,
            pogoUsername: data['pogoUsername'] as string,
            isSubscriber: data['isSubscriber'] as boolean,
            isVip: data['isVip'] as boolean,
            lastRaided: data['lastRaided']?.toDate?.() ?? new Date(),
            raidCount: data['raidCount'] as number,
          };
        }),
        lastDoc: snapshot.docs.at(-1) ?? null,
      }))
    );
  }
}
