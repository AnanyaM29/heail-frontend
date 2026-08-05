import { Component, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HeailLogoComponent } from '../../../shared/heail-logo.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, HeailLogoComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  loading = signal(false);
  error   = signal('');
  sent    = signal(false);

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.forgotPassword({ email: this.form.value.email! }).subscribe({
      next:  () => { this.sent.set(true); this.loading.set(false); },
      error: (e: any) => {
        this.error.set(e?.error?.message ?? 'Something went wrong. Please try again.');
        this.loading.set(false);
      }
    });
  }

  invalid(name: string) { const f = this.form.get(name)!; return f.invalid && f.touched; }
}
