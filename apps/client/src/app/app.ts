import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoginComponent } from './login/login.component';
import { AuthService } from './auth/auth.service';
import { SettingsComponent } from './settings/settings.component';
import { UiSettingsService } from './settings/ui-settings.service';

type BackgroundTile = {
  src: string;
  driftDelay: string;
  visibilityDelay: string;
};

const PSYDUCK_BACKGROUND_DRIFT_SECONDS = 38;
const PSYDUCK_BACKGROUND_SLOT_SECONDS = 6;
const PSYDUCK_BACKGROUND_SOURCES = ['psyduck_1.png', 'psyduck_2.png'];

@Component({
  imports: [RouterModule, LoginComponent, AsyncPipe, SettingsComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  protected readonly user$ = inject(AuthService).user$;
  protected readonly backgroundVisibilityDuration = `${PSYDUCK_BACKGROUND_SLOT_SECONDS * PSYDUCK_BACKGROUND_SOURCES.length}s`;
  protected readonly backgroundTiles: BackgroundTile[] = PSYDUCK_BACKGROUND_SOURCES.map((src, index, sources) => ({
    src: `/${src}`,
    driftDelay: `${-(PSYDUCK_BACKGROUND_DRIFT_SECONDS / sources.length) * index}s`,
    visibilityDelay: `${-(PSYDUCK_BACKGROUND_SLOT_SECONDS * index)}s`,
  }));
  private readonly uiSettings = inject(UiSettingsService);
  private regiriceSub: Subscription | null = null;

  protected readonly regirice = signal<{ id: number; style: string }[]>([]);
  private nextId = 0;

  ngOnInit(): void {
    this.regiriceSub = this.uiSettings.regirice$.subscribe(() => this.spawnRegirice());
  }

  ngOnDestroy(): void {
    this.regiriceSub?.unsubscribe();
  }

  protected spawnRegirice(): void {
    const id = this.nextId++;
    const spriteHalfWidth = 100;
    const left = Math.floor(Math.random() * (window.innerWidth - spriteHalfWidth * 2)) + spriteHalfWidth;
    const scaleX = Math.random() < 0.5 ? 1 : -1;
    const basePeak = window.innerHeight - 250;
    const peakOffset = Math.round(Math.random() * 160) - 80;
    const style = `left: ${left}px; --flip: ${scaleX}; --peak: ${basePeak + peakOffset}px;`;
    this.regirice.update((sprites) => [...sprites, { id, style }]);
    setTimeout(() => {
      this.regirice.update((sprites) => sprites.filter((s) => s.id !== id));
    }, 2050);
  }
}
