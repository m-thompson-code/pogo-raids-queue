import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoginComponent } from './login/login.component';
import { AuthService } from './auth/auth.service';
import { SettingsComponent } from './settings/settings.component';
import { UiSettingsService } from './settings/ui-settings.service';

@Component({
  imports: [RouterModule, LoginComponent, AsyncPipe, SettingsComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  protected readonly user$ = inject(AuthService).user$;
  private readonly uiSettings = inject(UiSettingsService);
  private regiriceSub: Subscription | null = null;

  protected readonly regiricePlaying = signal(false);
  protected readonly regiriceSpriteStyle = signal('');

  ngOnInit(): void {
    this.regiriceSub = this.uiSettings.regirice$.subscribe(() => this.spawnRegirice());
  }

  ngOnDestroy(): void {
    this.regiriceSub?.unsubscribe();
  }

  protected spawnRegirice(): void {
    if (this.regiricePlaying()) return;
    const offsetX = Math.round((Math.random() * 30) - 15); // -15% to +15%
    const scaleX = Math.random() < 0.5 ? 1 : -1;
    this.regiriceSpriteStyle.set(
      `left: calc(50% + ${offsetX}%); --flip: ${scaleX};`
    );
    this.regiricePlaying.set(true);
    setTimeout(() => this.regiricePlaying.set(false), 2050);
  }
}
