import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UiSettingsService } from './ui-settings.service';

interface Settings {
  darkMode: boolean;
  fontScale: number;
  bgColor: string;
}

const LEGACY_STORAGE_KEY = 'pogo-raid-settings';
const STORAGE_KEY_PREFIX = 'pogo-raid-settings';
const DARK_BG = '#13131f';
const LIGHT_BG = '#f4f4f8';
const DEFAULT: Settings = { darkMode: true, fontScale: 1, bgColor: DARK_BG };

const buildQueryScopedStorageKey = (): string => {
  if (typeof window === 'undefined') return `${STORAGE_KEY_PREFIX}:default`;

  const params = new URLSearchParams(window.location.search);
  const serialized = Array.from(params.entries())
    .sort(([keyA, valueA], [keyB, valueB]) => {
      if (keyA === keyB) return valueA.localeCompare(valueB);
      return keyA.localeCompare(keyB);
    })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return serialized
    ? `${STORAGE_KEY_PREFIX}:${serialized}`
    : `${STORAGE_KEY_PREFIX}:default`;
};

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit, OnDestroy {
  private readonly uiSettings = inject(UiSettingsService);
  private readonly settingsStorageKey = buildQueryScopedStorageKey();
  private strictModeSub: Subscription | null = null;
  protected settings: Settings = { ...DEFAULT };
  protected readonly strictMode = signal(false);
  protected open = false;

  readonly fontScaleOptions = [
    { label: 'S', value: 0.85 },
    { label: 'M', value: 1 },
    { label: 'L', value: 1.2 },
    { label: 'XL', value: 1.4 },
  ];

  ngOnInit(): void {
    try {
      const stored =
        localStorage.getItem(this.settingsStorageKey) ??
        localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) this.settings = { ...DEFAULT, ...JSON.parse(stored) };
    } catch { /* ignore */ }
    this.apply();
    this.strictModeSub = this.uiSettings.strictMode$.subscribe((enabled) => {
      this.strictMode.set(enabled);
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
    const next = !this.strictMode();
    this.strictMode.set(next);
    try {
      await this.uiSettings.setStrictMode(next);
    } catch {
      this.strictMode.set(!next);
    }
  }

  private apply(): void {
    const root = document.documentElement;
    root.style.setProperty('--bg', this.settings.bgColor);
    root.style.setProperty('--font-scale', String(this.settings.fontScale));
    document.body.classList.toggle('light', !this.settings.darkMode);
  }

  private save(): void {
    localStorage.setItem(this.settingsStorageKey, JSON.stringify(this.settings));
  }
}
