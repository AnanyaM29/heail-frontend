import { Component, signal, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-console',
  standalone: true,
  imports: [],
  templateUrl: './console.component.html'
})
export class AdminConsoleComponent {
  private auth = inject(AuthService);

  email = signal('');
  loading = signal(false);
  sent = signal(false);
  error = signal('');

  updateEmail(value: string) {
    this.email.set(value);
    this.sent.set(false);
  }

  sendResetEmail() {
    const email = this.email().trim();
    if (!email) return;
    this.loading.set(true);
    this.error.set('');
    this.sent.set(false);
    this.auth.forgotPassword({ email }).subscribe({
      next: () => { this.sent.set(true); this.loading.set(false); },
      error: (e: any) => {
        this.error.set(e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
