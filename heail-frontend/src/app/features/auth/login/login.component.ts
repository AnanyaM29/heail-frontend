import { Component, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HeailLogoComponent } from '../../../shared/heail-logo.component';
import { MruleComponent } from '../../../shared/mrule.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, HeailLogoComponent, MruleComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  loading = signal(false);
  error   = signal('');
  showPw  = signal(false);

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.form.getRawValue() as any).subscribe({
      next: () => this.auth.routeByRole(),
      error: (e: any) => {
        this.error.set(e?.error?.message ?? 'Invalid email or password.');
        this.loading.set(false);
      }
    });
  }

  field(name: string) { return this.form.get(name)!; }
  invalid(name: string) { const f = this.field(name); return f.invalid && f.touched; }
}
