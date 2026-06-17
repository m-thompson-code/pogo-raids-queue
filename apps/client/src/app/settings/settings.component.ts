import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UiSettingsService } from './ui-settings.service';

interface Settings {
  darkMode: boolean;
  fontScale: number;
  bgColor: string;
}

const STORAGE_KEY = 'pogo-raid-settings';
const DARK_BG = '#13131f';
const LIGHT_BG = '#f4f4f8';
const DEFAULT: Settings = { darkMode: true, fontScale: 1, bgColor: DARK_BG };

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit, OnDestroy {
  private readonly uiSettings = inject(UiSettingsService);
  private strictModeSub: Subscription | null = null;
  protected settings: Settings = { ...DEFAULT };
  protected strictMode = false;
  protected open = false;

  readonly fontScaleOptions = [
    { label: 'S', value: 0.85 },
    { label: 'M', value: 1 },
    { label: 'L', value: 1.2 },
    { label: 'XL', value: 1.4 },
  ];

  ngOnInit(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) this.settings = { ...DEFAULT, ...JSON.parse(stored) };
    } catch { /* ignore */ }
    this.apply();
    this.strictModeSub = this.uiSettings.strictMode$.subscribe((enabled) => {
      this.strictMode = enabled;
    });
  }

  ngOnDestroy(): void {
    this.strictModeSub?.unsubscribe();
  }

  protected toggleMode(): void {
    this.settings.darkMode = !this.settings.darkMode;
    this.settings.bgColor = this.settings.darkMode ? DARK_BG : LIGHT_BG;
    this.apply();
    this.save();
  }

  protected setFontScale(value: number): void {
    this.settings.fontScale = value;
    this.apply();
    this.save();
  }

  protected onBgChange(event: Event): void {
    this.settings.bgColor = (event.target as HTMLInputElement).value;
    this.apply();
    this.save();
  }

  protected async toggleStrictMode(): Promise<void> {
    const next = !this.strictMode;
    this.strictMode = next;
    try {
      await this.uiSettings.setStrictMode(next);
    } catch {
      this.strictMode = !next;
    }
  }

  private apply(): void {
    const root = document.documentElement;
    root.style.setProperty('--bg', this.settings.bgColor);
    root.style.setProperty('--font-scale', String(this.settings.fontScale));
    document.body.classList.toggle('light', !this.settings.darkMode);
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
  }
}
