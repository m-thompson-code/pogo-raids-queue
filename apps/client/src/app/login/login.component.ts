import { Component, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

const NUMPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['⌫', '0', '→'],
];

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);

  protected readonly rows = NUMPAD_ROWS;
  protected pin = '';
  protected loading = false;
  protected error = '';

  protected get pinDisplay(): string {
    return '●'.repeat(this.pin.length) + '○'.repeat(4 - this.pin.length);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      if (this.pin.length < 4) {
        this.pin += event.key;
        this.error = '';
      }
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      this.pin = this.pin.slice(0, -1);
      this.error = '';
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.submit();
    }
  }

  protected onPinInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    this.pin = raw.slice(0, 4);
    this.error = '';
  }

  protected pressKey(key: string): void {
    if (key === '⌫') {
      this.pin = this.pin.slice(0, -1);
      this.error = '';
    } else if (key === '→') {
      this.submit();
    } else if (this.pin.length < 4) {
      this.pin += key;
      this.error = '';
    }
  }

  protected async submit(): Promise<void> {
    if (this.pin.length < 4 || this.loading) return;
    this.loading = true;
    this.error = '';
    try {
      await this.authService.signIn(this.pin);
    } catch {
      this.error = 'Incorrect PIN. Try again.';
      this.pin = '';
    } finally {
      this.loading = false;
    }
  }
}
