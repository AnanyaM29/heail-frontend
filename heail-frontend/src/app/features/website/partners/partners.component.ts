import { Component, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { COUNTRIES } from '../../../shared/countries';
import { PartnerService } from '../../../core/services/partner.service';

@Component({ selector: 'app-partners', standalone: true, imports: [RouterLink], templateUrl: './partners.component.html' })
export class PartnersComponent {
  private partners = inject(PartnerService);
  private http = inject(HttpClient);

  countries = COUNTRIES;

  name = signal('');
  country = signal('');
  city = signal('');
  cityOptions = signal<string[]>([]);
  citiesLoading = signal(false);
  cityDisabled = signal(true);
  mobileCc = signal('+91');
  mobile = signal('');
  email = signal('');
  otp = signal('');
  resume = signal<File | null>(null);
  consentGiven = signal(false);
  touched = signal(false);

  otpSending = signal(false);
  otpSent = signal(false);
  otpError = signal('');

  submitting = signal(false);
  submitError = signal('');
  submitted = signal(false);

  onCountryChange(event: Event) {
    const countryName = (event.target as HTMLSelectElement).value;
    this.country.set(countryName);
    this.city.set('');
    this.cityDisabled.set(true);
    this.cityOptions.set([]);

    const country = this.countries.find(c => c.name === countryName);
    if (!country) return;

    this.citiesLoading.set(true);
    this.http.get<string[]>(`/data/cities/${country.iso2}.json`).subscribe({
      next: cities => {
        this.cityOptions.set(cities);
        this.citiesLoading.set(false);
        this.cityDisabled.set(false);
      },
      error: () => { this.cityOptions.set([]); this.citiesLoading.set(false); }
    });
  }

  onMobileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 10);
    input.value = digitsOnly;
    this.mobile.set(digitsOnly);
  }

  onResumeSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.resume.set(input.files?.[0] ?? null);
  }

  get emailValid() { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email()); }

  get nameInvalid() { return this.touched() && !this.name().trim(); }
  get countryInvalid() { return this.touched() && !this.country(); }
  get cityInvalid() { return this.touched() && !this.city().trim(); }
  get mobileInvalid() { return this.touched() && this.mobile().length !== 10; }
  get emailInvalid() { return this.touched() && !this.emailValid; }
  get otpInvalid() { return this.touched() && !this.otp().trim(); }
  get resumeInvalid() { return this.touched() && !this.resume(); }
  get consentInvalid() { return this.touched() && !this.consentGiven(); }

  sendCode() {
    if (!this.emailValid) { this.touched.set(true); return; }

    this.otpSending.set(true);
    this.otpError.set('');
    this.partners.sendOtp(this.email()).subscribe({
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

  private fieldsMissing() {
    return !this.name().trim() || !this.country() || !this.city().trim()
      || this.mobile().length !== 10 || !this.emailValid || !this.otp().trim()
      || !this.resume() || !this.consentGiven();
  }

  submit() {
    this.touched.set(true);
    this.submitError.set('');

    if (this.fieldsMissing()) {
      this.submitError.set('Please fill in all required fields, verify your email, and attach your resume.');
      return;
    }

    this.submitting.set(true);
    this.partners.apply({
      name: this.name().trim(),
      country: this.country(),
      city: this.city().trim(),
      mobile: this.mobileCc() + this.mobile(),
      email: this.email(),
      otp: this.otp().trim(),
      consentGiven: this.consentGiven(),
      resume: this.resume()
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
      },
      error: (e: any) => {
        this.submitting.set(false);
        this.submitError.set(e?.error?.message ?? 'Something went wrong. Please try again.');
      }
    });
  }
}
