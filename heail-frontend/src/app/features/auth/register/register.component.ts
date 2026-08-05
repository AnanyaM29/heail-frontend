import { Component, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HeailLogoComponent } from '../../../shared/heail-logo.component';
import { COUNTRIES } from '../../../shared/countries';

function passwordMatch(g: AbstractControl): ValidationErrors | null {
  return g.get('password')?.value === g.get('confirm')?.value ? null : { mismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, HeailLogoComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  countries = COUNTRIES;

  cityOptions = signal<string[]>([]);
  citiesLoading = signal(false);

  form = this.fb.group({
    name:             ['', Validators.required],
    email:            ['', [Validators.required, Validators.email]],
    otp:              ['', Validators.required],
    mobileCc:         ['+91', Validators.required],
    mobile:           ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    city:             [{ value: '', disabled: true }, Validators.required],
    country:          ['', Validators.required],
    passwords: this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm:  ['', Validators.required]
    }, { validators: passwordMatch }),
    termsAccepted:    [false, Validators.requiredTrue]
  });

  loading    = signal(false);
  error      = signal('');
  showPw     = signal(false);

  otpSending = signal(false);
  otpSent    = signal(false);
  otpError   = signal('');

  get pwGroup()      { return this.form.get('passwords')!; }
  get cityDisabled() { return this.form.get('city')?.disabled ?? true; }

  onCountryChange(event: Event) {
    const countryName = (event.target as HTMLSelectElement).value;
    const cityCtrl = this.form.get('city')!;
    cityCtrl.setValue('');
    cityCtrl.disable();
    this.cityOptions.set([]);

    const country = this.countries.find(c => c.name === countryName);
    if (!country) return;

    this.citiesLoading.set(true);
    this.http.get<string[]>(`/data/cities/${country.iso2}.json`).subscribe({
      next: cities => {
        this.cityOptions.set(cities);
        this.citiesLoading.set(false);
        cityCtrl.enable();
      },
      error: () => { this.cityOptions.set([]); this.citiesLoading.set(false); }
    });
  }

  onMobileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 10);
    this.form.get('mobile')?.setValue(digitsOnly);
  }

  sendCode() {
    const emailCtrl = this.form.get('email')!;
    if (emailCtrl.invalid) { emailCtrl.markAsTouched(); return; }

    this.otpSending.set(true);
    this.otpError.set('');
    this.auth.sendRegistrationOtp(emailCtrl.value as string).subscribe({
      next: () => {
        this.otpSending.set(false);
        this.otpSent.set(true);
      },
      error: (e: any) => {
        this.otpSending.set(false);
        this.otpError.set(e?.error?.message ?? 'Could not send the code. Please try again.');
      }
    });
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.getRawValue();
    const mobileCc = v.mobileCc ?? '+91';
    const mobile = v.mobile ?? '';
    const payload: any = {
      name:     v.name,
      email:    v.email,
      otp:      v.otp,
      mobile:   mobileCc + mobile,
      password: v.passwords.password,
      city:     v.city,
      country:  v.country
    };

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
