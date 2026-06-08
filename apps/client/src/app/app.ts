import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RaidQueueComponent } from './raid-queue/raid-queue.component';
import { LoginComponent } from './login/login.component';
import { AuthService } from './auth/auth.service';
import { SettingsComponent } from './settings/settings.component';

@Component({
  imports: [RouterModule, RaidQueueComponent, LoginComponent, AsyncPipe, SettingsComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly user$ = inject(AuthService).getUser();
}
