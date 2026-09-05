import { Component, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TEST_AUTH_KEY, FRESH_AUTH_KEY, isAssessmentUrl, isTestDestination } from '../../../core/guards/auth.guard';
import { HeailLogoComponent } from '../../../shared/heail-logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, HeailLogoComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

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
      next: () => {
        // If we got here mid-purchase (redirected to log in before
        // continuing), go back to exactly that instead of the role's
        // default homepage (which sends a SUPERADMIN to /admin, stranding
        // them away from what they were actually doing).
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl) {
          // The assessment players gate on a fresh sign-in. Signing in on the way
          // to any test area marks the whole session as freshly authenticated;
          // a specific player URL also gets a one-shot marker for that exact URL.
          try {
            if (isTestDestination(returnUrl)) sessionStorage.setItem(FRESH_AUTH_KEY, '1');
            if (isAssessmentUrl(returnUrl)) sessionStorage.setItem(TEST_AUTH_KEY, returnUrl);
          } catch {}
          this.router.navigateByUrl(returnUrl);
        } else this.auth.routeByRole();
      },
      error: (e: any) => {
        this.error.set(e?.error?.message ?? 'Invalid email or password.');
        this.loading.set(false);
      }
    });
  }

  field(name: string) { return this.form.get(name)!; }
  invalid(name: string) { const f = this.field(name); return f.invalid && f.touched; }
}
