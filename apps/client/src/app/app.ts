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
    const offsetX = Math.round((Math.random() * 30) - 15);
    const scaleX = Math.random() < 0.5 ? 1 : -1;
    const style = `left: calc(50% + ${offsetX}%); --flip: ${scaleX};`;
    this.regirice.update((sprites) => [...sprites, { id, style }]);
    setTimeout(() => {
      this.regirice.update((sprites) => sprites.filter((s) => s.id !== id));
    }, 2050);
  }
}
