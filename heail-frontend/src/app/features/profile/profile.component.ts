import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileResponse } from '../../core/models/profile.models';

/**
 * Self-service "Update Profile" page. Editing is gated in two layers:
 *
 *  1. Nothing is editable at all until an OTP emailed to the account's
 *     CURRENT address is verified ("unlock" step) — proves the caller still
 *     controls the account before letting them change anything.
 *  2. If they then change the email or mobile to a genuinely new value,
 *     THAT new value needs its own separate OTP before Save will accept it
 *     — emailed to the new address for email changes, or to the current
 *     address for mobile changes (no SMS gateway exists in this project).
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  private profileSvc = inject(ProfileService);
  private auth = inject(AuthService);

  loading = signal(true);
  error = signal('');
  profile = signal<ProfileResponse | null>(null);

  // ── Step 1: unlock ──────────────────────────────────────────────
  unlocking = signal(false);
  unlockOtpSent = signal(false);
  unlockOtp = signal('');
  unlockError = signal('');
  unlocked = signal(false);

  // ── Editable fields (populated once profile loads) ──────────────
  name = signal('');
  city = signal('');
  country = signal('');
  email = signal('');
  mobile = signal('');

  emailChanged = computed(() => this.unlocked() && this.email().trim().toLowerCase() !== (this.profile()?.email ?? ''));
  mobileChanged = computed(() => this.unlocked() && this.mobile().trim() !== (this.profile()?.mobile ?? ''));

  // ── New-email verification ───────────────────────────────────────
  newEmailOtpSent = signal(false);
  newEmailOtp = signal('');
  newEmailVerified = signal(false);
  newEmailVerifiedFor = signal(''); // which exact address the verification applies to
  newEmailLoading = signal(false);
  newEmailError = signal('');

  // ── New-mobile verification ──────────────────────────────────────
  newMobileOtpSent = signal(false);
  newMobileOtp = signal('');
  newMobileVerified = signal(false);
  newMobileVerifiedFor = signal('');
  newMobileLoading = signal(false);
  newMobileError = signal('');

  // ── Save ──────────────────────────────────────────────────────────
  saving = signal(false);
  saveError = signal('');
  saved = signal(false);

  canSave = computed(() => {
    if (!this.unlocked()) return false;
    if (!this.name().trim()) return false;
    if (this.emailChanged() && !(this.newEmailVerified() && this.newEmailVerifiedFor() === this.email().trim().toLowerCase())) return false;
    if (this.mobileChanged() && this.mobile().trim() && !(this.newMobileVerified() && this.newMobileVerifiedFor() === this.mobile().trim())) return false;
    return true;
  });

  ngOnInit() {
    this.profileSvc.get().subscribe({
      next: p => {
        this.profile.set(p);
        this.name.set(p.name);
        this.city.set(p.city ?? '');
        this.country.set(p.country ?? '');
        this.email.set(p.email);
        this.mobile.set(p.mobile ?? '');
        this.loading.set(false);
      },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  // ── Step 1: unlock ──────────────────────────────────────────────
  sendUnlockOtp() {
    this.unlocking.set(true);
    this.unlockError.set('');
    this.profileSvc.sendOtp({ purpose: 'CURRENT' }).subscribe({
      next: () => { this.unlocking.set(false); this.unlockOtpSent.set(true); },
      error: (e: any) => { this.unlocking.set(false); this.unlockError.set(this.msg(e)); }
    });
  }

  verifyUnlockOtp() {
    if (!this.unlockOtp().trim()) return;
    this.unlocking.set(true);
    this.unlockError.set('');
    this.profileSvc.verifyOtp({ purpose: 'CURRENT', otp: this.unlockOtp().trim() }).subscribe({
      next: () => { this.unlocking.set(false); this.unlocked.set(true); },
      error: (e: any) => { this.unlocking.set(false); this.unlockError.set(this.msg(e)); }
    });
  }

  // ── New-email verification ───────────────────────────────────────
  onEmailEdited(value: string) {
    this.email.set(value);
    // Any edit invalidates a previous verification for a different address.
    if (this.newEmailVerifiedFor() !== value.trim().toLowerCase()) {
      this.newEmailVerified.set(false);
      this.newEmailOtpSent.set(false);
      this.newEmailOtp.set('');
    }
  }

  sendNewEmailOtp() {
    const target = this.email().trim().toLowerCase();
    if (!target) return;
    this.newEmailLoading.set(true);
    this.newEmailError.set('');
    this.profileSvc.sendOtp({ purpose: 'NEW_EMAIL', target }).subscribe({
      next: () => { this.newEmailLoading.set(false); this.newEmailOtpSent.set(true); },
      error: (e: any) => { this.newEmailLoading.set(false); this.newEmailError.set(this.msg(e)); }
    });
  }

  verifyNewEmailOtp() {
    const target = this.email().trim().toLowerCase();
    if (!this.newEmailOtp().trim()) return;
    this.newEmailLoading.set(true);
    this.newEmailError.set('');
    this.profileSvc.verifyOtp({ purpose: 'NEW_EMAIL', target, otp: this.newEmailOtp().trim() }).subscribe({
      next: () => {
        this.newEmailLoading.set(false);
        this.newEmailVerified.set(true);
        this.newEmailVerifiedFor.set(target);
      },
      error: (e: any) => { this.newEmailLoading.set(false); this.newEmailError.set(this.msg(e)); }
    });
  }

  // ── New-mobile verification ──────────────────────────────────────
  onMobileEdited(event: Event) {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 10);
    this.mobile.set(digitsOnly);
    if (this.newMobileVerifiedFor() !== digitsOnly) {
      this.newMobileVerified.set(false);
      this.newMobileOtpSent.set(false);
      this.newMobileOtp.set('');
    }
  }

  sendNewMobileOtp() {
    if (!this.mobile().trim()) return;
    this.newMobileLoading.set(true);
    this.newMobileError.set('');
    this.profileSvc.sendOtp({ purpose: 'NEW_MOBILE' }).subscribe({
      next: () => { this.newMobileLoading.set(false); this.newMobileOtpSent.set(true); },
      error: (e: any) => { this.newMobileLoading.set(false); this.newMobileError.set(this.msg(e)); }
    });
  }

  verifyNewMobileOtp() {
    const target = this.mobile().trim();
    if (!this.newMobileOtp().trim()) return;
    this.newMobileLoading.set(true);
    this.newMobileError.set('');
    this.profileSvc.verifyOtp({ purpose: 'NEW_MOBILE', otp: this.newMobileOtp().trim() }).subscribe({
      next: () => {
        this.newMobileLoading.set(false);
        this.newMobileVerified.set(true);
        this.newMobileVerifiedFor.set(target);
      },
      error: (e: any) => { this.newMobileLoading.set(false); this.newMobileError.set(this.msg(e)); }
    });
  }

  // ── Save ──────────────────────────────────────────────────────────
  save() {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.saveError.set('');
    this.saved.set(false);
    this.profileSvc.update({
      name: this.name().trim(),
      city: this.city().trim(),
      country: this.country().trim(),
      email: this.email().trim().toLowerCase(),
      mobile: this.mobile().trim()
    }).subscribe({
      next: res => {
        this.auth.applyAuthResponse(res);
        this.profile.set({
          name: this.name().trim(),
          email: this.email().trim().toLowerCase(),
          mobile: this.mobile().trim() || null,
          city: this.city().trim() || null,
          country: this.country().trim() || null,
          role: this.profile()?.role ?? ''
        });
        this.saving.set(false);
        this.saved.set(true);
      },
      error: (e: any) => { this.saving.set(false); this.saveError.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
