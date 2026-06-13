import { Injectable, OnDestroy } from '@angular/core';
import { getFirestore, doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { Subject } from 'rxjs';

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
  private unsubscribe: Unsubscribe | null = null;
  private lastRegirice: number | null = null;

  readonly regirice$ = new Subject<void>();

  constructor() {
    const db = getFirestore();
    this.unsubscribe = onSnapshot(doc(db, 'settings', 'ui'), (snapshot) => {
      const count: number | null = snapshot.data()?.['regirice'] ?? null;

      if (this.lastRegirice === null) {
        // First snapshot — store baseline, don't animate
        this.lastRegirice = count;
        return;
      }

      if (count !== null && count !== this.lastRegirice) {
        this.lastRegirice = count;
        this.regirice$.next();
      }
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
  }
}
