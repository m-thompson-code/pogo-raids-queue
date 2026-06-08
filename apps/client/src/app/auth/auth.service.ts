import { Injectable } from '@angular/core';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { BehaviorSubject, type Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const ADMIN_EMAIL = 'hydro.pogo.bot@gmail.com';
const PASSWORD_PREFIX = 'moo';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth;

  /**
   * `undefined`  — auth state not yet determined (initial load)
   * `null`       — signed out
   * `User`       — signed in
   */
  private readonly user$ = new BehaviorSubject<User | null | undefined>(
    undefined
  );

  constructor() {
    const app =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp(environment.firebase);

    this.auth = getAuth(app);

    onAuthStateChanged(this.auth, (user) => this.user$.next(user));
  }

  getUser(): Observable<User | null | undefined> {
    return this.user$.asObservable();
  }

  /** Signs in with the hardcoded email and the prefix + supplied 4-digit pin */
  async signIn(pin: string): Promise<void> {
    await signInWithEmailAndPassword(
      this.auth,
      ADMIN_EMAIL,
      `${PASSWORD_PREFIX}${pin}`
    );
  }
}
