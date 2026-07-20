import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HeailLogoComponent } from '../../../shared/heail-logo.component';
import { MruleComponent } from '../../../shared/mrule.component';

function passwordMatch(g: AbstractControl): ValidationErrors | null {
  return g.get('newPassword')?.value === g.get('confirm')?.value ? null : { mismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, HeailLogoComponent, MruleComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  form = this.fb.group({
    email:       ['', [Validators.required, Validators.email]],
    otp:         ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirm:     ['', Validators.required]
  }, { validators: passwordMatch });

  loading  = signal(false);
  error    = signal('');
  done     = signal(false);
  showPw   = signal(false);

  ngOnInit() {
    const { email, otp } = this.route.snapshot.queryParams;
    if (email) this.form.patchValue({ email });
    if (otp) this.form.patchValue({ otp });
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');
    this.auth.resetPassword({
      email: v.email!,
      otp: v.otp!,
      newPassword: v.newPassword!
    }).subscribe({
      next:  () => { this.done.set(true); this.loading.set(false); },
      error: (e: any) => {
        this.error.set(e?.error?.message ?? 'Reset failed. The code may have expired.');
        this.loading.set(false);
      }
    });
  }

  invalid(name: string) { const f = this.form.get(name)!; return f.invalid && f.touched; }
}
