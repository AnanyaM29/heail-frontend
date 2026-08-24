import { Component, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { COUNTRIES } from '../../../shared/countries';
import { ContactService } from '../../../core/services/contact.service';

@Component({ selector: 'app-contact', standalone: true, templateUrl: './contact.component.html' })
export class ContactComponent {
  private contact = inject(ContactService);
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
  message = signal('');
  otp = signal('');
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

  static readonly MAX_MESSAGE_WORDS = 200;

  messageWordCount = computed(() => {
    const trimmed = this.message().trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  });

  onMessageInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    const words = textarea.value.split(/\s+/).filter(Boolean);
    if (words.length > ContactComponent.MAX_MESSAGE_WORDS) {
      const truncated = words.slice(0, ContactComponent.MAX_MESSAGE_WORDS).join(' ');
      textarea.value = truncated;
      this.message.set(truncated);
    } else {
      this.message.set(textarea.value);
    }
  }

  get emailValid() { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email()); }

  get nameInvalid() { return this.touched() && !this.name().trim(); }
  get countryInvalid() { return this.touched() && !this.country(); }
  get cityInvalid() { return this.touched() && !this.city().trim(); }
  get mobileInvalid() { return this.touched() && this.mobile().length !== 10; }
  get emailInvalid() { return this.touched() && !this.emailValid; }
  get messageInvalid() { return this.touched() && !this.message().trim(); }
  get otpInvalid() { return this.touched() && !this.otp().trim(); }

  sendCode() {
    if (!this.emailValid || this.mobile().length !== 10) { this.touched.set(true); return; }

    this.otpSending.set(true);
    this.otpError.set('');
    this.contact.sendOtp(this.email(), this.mobileCc() + this.mobile()).subscribe({
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
      || this.mobile().length !== 10 || !this.emailValid || !this.message().trim() || !this.otp().trim();
  }

  submit() {
    this.touched.set(true);
    this.submitError.set('');

    if (this.fieldsMissing()) {
      this.submitError.set('Please fill in all required fields and verify your details.');
      return;
    }

    this.submitting.set(true);
    this.contact.submit({
      name: this.name().trim(),
      mobile: this.mobileCc() + this.mobile(),
      email: this.email(),
      city: this.city().trim(),
      country: this.country(),
      message: this.message().trim(),
      otp: this.otp().trim()
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
