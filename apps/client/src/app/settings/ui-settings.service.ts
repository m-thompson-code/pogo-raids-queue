import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { getFirestore, doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { BehaviorSubject, Subject } from 'rxjs';

/**
 * Listens to the `settings/ui` Firestore document.
 * Emits on `regirice$` whenever the `regirice` counter increments
 * after the initial load (so the animation only triggers on updates,
 * not on page load).
 *
 * Expected document shape:
 *   settings/ui { regirice: number }
 */
@Injectable({ providedIn: 'root' })
export class UiSettingsService implements OnDestroy {
  private readonly ngZone = inject(NgZone);
  private unsubscribe: Unsubscribe | null = null;
  private lastRegirice: number | null = null;

  readonly regirice$ = new Subject<void>();
  readonly strictMode$ = new BehaviorSubject<boolean>(false);

  constructor() {
    const db = getFirestore();
    this.unsubscribe = onSnapshot(doc(db, 'settings', 'ui'), (snapshot) => {
      const count: number | null = snapshot.data()?.['regirice'] ?? null;
      const strictMode = snapshot.data()?.['strictMode'];

      if (typeof strictMode === 'boolean') {
        this.ngZone.run(() => {
          this.strictMode$.next(strictMode);
        });
      }

      if (this.lastRegirice === null) {
        // First snapshot — store baseline, don't animate
        this.lastRegirice = count;
        return;
      }

      if (count !== null && count !== this.lastRegirice) {
        this.lastRegirice = count;
        this.ngZone.run(() => {
          this.regirice$.next();
        });
      }
    });
  }

  async setStrictMode(enabled: boolean): Promise<void> {
    const db = getFirestore();
    await setDoc(doc(db, 'settings', 'ui'), { strictMode: enabled }, { merge: true });
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
  }
}
