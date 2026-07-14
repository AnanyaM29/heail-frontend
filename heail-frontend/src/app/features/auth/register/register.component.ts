import { Component, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HeailLogoComponent } from '../../../shared/heail-logo.component';
import { MruleComponent } from '../../../shared/mrule.component';

function passwordMatch(g: AbstractControl): ValidationErrors | null {
  return g.get('password')?.value === g.get('confirm')?.value ? null : { mismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, HeailLogoComponent, MruleComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

  form = this.fb.group({
    role:             ['ORG_ADMIN', Validators.required],
    name:             ['', Validators.required],
    email:            ['', [Validators.required, Validators.email]],
    passwords: this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm:  ['', Validators.required]
    }, { validators: passwordMatch }),
    // ORG_ADMIN only
    organisationName: [''],
    industry:         [''],
    sizeCategory:     [''],
    // EMPLOYEE / LEADER only
    organisationId:   [''],
    termsAccepted:    [false, Validators.requiredTrue]
  });

  loading  = signal(false);
  error    = signal('');
  showPw   = signal(false);

  get isOrgAdmin()  { return this.form.get('role')?.value === 'ORG_ADMIN'; }
  get isEmployee()  { return !this.isOrgAdmin; }
  get pwGroup()      { return this.form.get('passwords')!; }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.getRawValue();
    const payload: any = {
      name:     v.name,
      email:    v.email,
      password: v.passwords.password,
      role:     v.role
    };

    if (this.isOrgAdmin) {
      payload.organisationName = v.organisationName;
      payload.industry         = v.industry;
      payload.sizeCategory     = v.sizeCategory;
    } else {
      payload.organisationId = v.organisationId;
    }

    this.loading.set(true);
    this.error.set('');
    this.auth.register(payload).subscribe({
      next: () => this.auth.routeByRole(),
      error: (e: any) => {
        this.error.set(e?.error?.message ?? 'Registration failed. Please try again.');
        this.loading.set(false);
      }
    });
  }

  field(name: string) { return this.form.get(name)!; }
  invalid(name: string) { const f = this.field(name); return f.invalid && f.touched; }
  pwInvalid(name: string) { const f = this.pwGroup.get(name)!; return f.invalid && f.touched; }
}
