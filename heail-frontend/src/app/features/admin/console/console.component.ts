import { Component, OnInit, signal, computed, inject, WritableSignal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { AdminPartner, AdminPayment, AdminTestSession, AdminUser, DiscountCoupon } from '../../../core/models/admin.models';

type Tab = 'reset' | 'tests' | 'payments' | 'users' | 'logins' | 'partners' | 'coupons';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-admin-console',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './console.component.html',
  styleUrl: './console.component.css'
})
export class AdminConsoleComponent implements OnInit {
  private auth = inject(AuthService);
  private admin = inject(AdminService);

  tab = signal<Tab>('users');

  ngOnInit() {
    this.loadUsers();
  }

  // ── Resend password-reset email ──────────────────────────────
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

  // ── Tests (last N months) ────────────────────────────────────
  testsMonths = signal(3);
  tests = signal<AdminTestSession[]>([]);
  testsLoading = signal(false);
  testsError = signal('');
  testsLoaded = false;
  testsPage = signal(1);
  testsSearch = signal('');
  filteredTests = computed(() => {
    const q = this.testsSearch().trim().toLowerCase();
    if (!q) return this.tests();
    return this.tests().filter(t =>
      (t.userName ?? '').toLowerCase().includes(q) ||
      (t.userEmail ?? '').toLowerCase().includes(q) ||
      (t.organisationName ?? '').toLowerCase().includes(q) ||
      (t.productCode ?? '').toLowerCase().includes(q) ||
      (t.pulse ?? '').toLowerCase().includes(q)
    );
  });
  testsTotalPages = computed(() => totalPages(this.filteredTests().length));
  pagedTests = computed(() => pageSlice(this.filteredTests(), this.testsPage()));
  updateTestsSearch(value: string) { this.testsSearch.set(value); this.testsPage.set(1); }

  // ── Payments (last N months) — 24 so admin can always see, and resend
  //    the invoice for, any paid order from the last two years (matching
  //    the backend's own resend-invoice window). ────────────────────
  paymentsMonths = signal(24);
  payments = signal<AdminPayment[]>([]);
  paymentsLoading = signal(false);
  paymentsError = signal('');
  paymentsLoaded = false;
  paymentsPage = signal(1);
  paymentsSearch = signal('');
  filteredPayments = computed(() => {
    const q = this.paymentsSearch().trim().toLowerCase();
    if (!q) return this.payments();
    return this.payments().filter(p =>
      (p.userName ?? '').toLowerCase().includes(q) ||
      (p.userEmail ?? '').toLowerCase().includes(q) ||
      (p.productCode ?? '').toLowerCase().includes(q) ||
      (p.status ?? '').toLowerCase().includes(q)
    );
  });
  paymentsTotalPages = computed(() => totalPages(this.filteredPayments().length));
  pagedPayments = computed(() => pageSlice(this.filteredPayments(), this.paymentsPage()));
  updatePaymentsSearch(value: string) { this.paymentsSearch.set(value); this.paymentsPage.set(1); }

  // ── Registered users, chronological ──────────────────────────
  users = signal<AdminUser[]>([]);
  usersLoading = signal(false);
  usersError = signal('');
  usersLoaded = false;
  usersPage = signal(1);
  userSearch = signal('');
  filteredUsers = computed(() => {
    const q = this.userSearch().trim().toLowerCase();
    if (!q) return this.users();
    return this.users().filter(u =>
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q) ||
      (u.organisationName ?? '').toLowerCase().includes(q)
    );
  });
  usersTotalPages = computed(() => totalPages(this.filteredUsers().length));
  pagedUsers = computed(() => pageSlice(this.filteredUsers(), this.usersPage()));

  // ── Logged-in users (last N months) ──────────────────────────
  loginsMonths = signal(12);
  logins = signal<AdminUser[]>([]);
  loginsLoading = signal(false);
  loginsError = signal('');
  loginsLoaded = false;
  loginsPage = signal(1);
  loginsSearch = signal('');
  filteredLogins = computed(() => {
    const q = this.loginsSearch().trim().toLowerCase();
    if (!q) return this.logins();
    return this.logins().filter(u =>
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q) ||
      (u.organisationName ?? '').toLowerCase().includes(q)
    );
  });
  loginsTotalPages = computed(() => totalPages(this.filteredLogins().length));
  pagedLogins = computed(() => pageSlice(this.filteredLogins(), this.loginsPage()));
  updateLoginsSearch(value: string) { this.loginsSearch.set(value); this.loginsPage.set(1); }

  // ── Partner applications, chronological ──────────────────────
  partners = signal<AdminPartner[]>([]);
  partnersLoading = signal(false);
  partnersError = signal('');
  partnersLoaded = false;
  partnersPage = signal(1);
  partnersSearch = signal('');
  filteredPartners = computed(() => {
    const q = this.partnersSearch().trim().toLowerCase();
    if (!q) return this.partners();
    return this.partners().filter(p =>
      (p.name ?? '').toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      (p.city ?? '').toLowerCase().includes(q) ||
      (p.country ?? '').toLowerCase().includes(q)
    );
  });
  partnersTotalPages = computed(() => totalPages(this.filteredPartners().length));
  pagedPartners = computed(() => pageSlice(this.filteredPartners(), this.partnersPage()));
  updatePartnersSearch(value: string) { this.partnersSearch.set(value); this.partnersPage.set(1); }

  // ── Discount coupons ──────────────────────────────────────────
  coupons = signal<DiscountCoupon[]>([]);
  couponsLoading = signal(false);
  couponsError = signal('');
  couponsLoaded = false;
  couponsPage = signal(1);
  couponsSearch = signal('');
  filteredCoupons = computed(() => {
    const q = this.couponsSearch().trim().toLowerCase();
    if (!q) return this.coupons();
    return this.coupons().filter(c =>
      (c.code ?? '').toLowerCase().includes(q) ||
      (c.createdBy ?? '').toLowerCase().includes(q) ||
      (c.usedByEmail ?? '').toLowerCase().includes(q)
    );
  });
  couponsTotalPages = computed(() => totalPages(this.filteredCoupons().length));
  pagedCoupons = computed(() => pageSlice(this.filteredCoupons(), this.couponsPage()));
  updateCouponsSearch(value: string) { this.couponsSearch.set(value); this.couponsPage.set(1); }

  newCouponPercent = signal(100);
  newCouponEmail = signal('');
  couponGenerating = signal(false);
  lastGeneratedCode = signal('');
  revokingCode = signal<string | null>(null);

  couponStatus(c: DiscountCoupon): 'Used' | 'Revoked' | 'Expired' | 'Active' {
    if (c.usedAt) return 'Used';
    if (!c.active) return 'Revoked';
    if (c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now()) return 'Expired';
    return 'Active';
  }

  loadCoupons() {
    this.couponsLoading.set(true);
    this.couponsError.set('');
    this.admin.listCoupons().subscribe({
      next: rows => { this.coupons.set(rows); this.couponsPage.set(1); this.couponsLoading.set(false); this.couponsLoaded = true; },
      error: (e: any) => {
        this.couponsError.set(e?.error?.message ?? e?.error?.error ?? 'Could not load coupons.');
        this.couponsLoading.set(false);
      }
    });
  }

  generateCoupon() {
    if (this.couponGenerating()) return;
    const pct = this.newCouponPercent();
    if (pct == null || pct < 0 || pct > 100) return;
    this.couponGenerating.set(true);
    this.couponsError.set('');
    this.lastGeneratedCode.set('');
    this.admin.generateCoupon(pct, this.newCouponEmail().trim()).subscribe({
      next: coupon => {
        this.coupons.update(rows => [coupon, ...rows]);
        this.lastGeneratedCode.set(coupon.code);
        this.newCouponEmail.set('');
        this.couponGenerating.set(false);
      },
      error: (e: any) => {
        this.couponsError.set(e?.error?.message ?? e?.error?.error ?? 'Could not generate coupon.');
        this.couponGenerating.set(false);
      }
    });
  }

  revokeCoupon(c: DiscountCoupon) {
    if (this.revokingCode()) return;
    this.revokingCode.set(c.code);
    this.couponsError.set('');
    this.admin.revokeCoupon(c.code).subscribe({
      next: () => {
        this.coupons.update(rows => rows.map(row => row.code === c.code ? { ...row, active: false } : row));
        this.revokingCode.set(null);
      },
      error: (e: any) => {
        this.couponsError.set(e?.error?.message ?? e?.error?.error ?? 'Could not revoke this coupon.');
        this.revokingCode.set(null);
      }
    });
  }

  setPage(pageSignal: WritableSignal<number>, page: number, totalPages: number) {
    pageSignal.set(Math.min(Math.max(1, page), totalPages));
  }

  selectTab(t: Tab) {
    this.tab.set(t);
    if (t === 'tests' && !this.testsLoaded) this.loadTests();
    if (t === 'payments' && !this.paymentsLoaded) this.loadPayments();
    if (t === 'users' && !this.usersLoaded) this.loadUsers();
    if (t === 'logins' && !this.loginsLoaded) this.loadLogins();
    if (t === 'partners' && !this.partnersLoaded) this.loadPartners();
    if (t === 'coupons' && !this.couponsLoaded) this.loadCoupons();
  }

  loadTests() {
    this.testsLoading.set(true);
    this.testsError.set('');
    this.admin.tests(this.testsMonths()).subscribe({
      next: rows => { this.tests.set(rows); this.testsPage.set(1); this.testsLoading.set(false); this.testsLoaded = true; },
      error: (e: any) => {
        this.testsError.set(e?.error?.message ?? e?.error?.error ?? 'Could not load test activity.');
        this.testsLoading.set(false);
      }
    });
  }

  loadPayments() {
    this.paymentsLoading.set(true);
    this.paymentsError.set('');
    this.admin.payments(this.paymentsMonths()).subscribe({
      next: rows => { this.payments.set(rows); this.paymentsPage.set(1); this.paymentsLoading.set(false); this.paymentsLoaded = true; },
      error: (e: any) => {
        this.paymentsError.set(e?.error?.message ?? e?.error?.error ?? 'Could not load payments.');
        this.paymentsLoading.set(false);
      }
    });
  }

  loadUsers() {
    this.usersLoading.set(true);
    this.usersError.set('');
    this.admin.users().subscribe({
      next: rows => { this.users.set(rows); this.usersPage.set(1); this.usersLoading.set(false); this.usersLoaded = true; },
      error: (e: any) => {
        this.usersError.set(e?.error?.message ?? e?.error?.error ?? 'Could not load users.');
        this.usersLoading.set(false);
      }
    });
  }

  loadLogins() {
    this.loginsLoading.set(true);
    this.loginsError.set('');
    this.admin.logins(this.loginsMonths()).subscribe({
      next: rows => { this.logins.set(rows); this.loginsPage.set(1); this.loginsLoading.set(false); this.loginsLoaded = true; },
      error: (e: any) => {
        this.loginsError.set(e?.error?.message ?? e?.error?.error ?? 'Could not load login activity.');
        this.loginsLoading.set(false);
      }
    });
  }

  loadPartners() {
    this.partnersLoading.set(true);
    this.partnersError.set('');
    this.admin.partners().subscribe({
      next: rows => { this.partners.set(rows); this.partnersPage.set(1); this.partnersLoading.set(false); this.partnersLoaded = true; },
      error: (e: any) => {
        this.partnersError.set(e?.error?.message ?? e?.error?.error ?? 'Could not load partner applications.');
        this.partnersLoading.set(false);
      }
    });
  }

  // ── Resume download — fetched as a blob so the request carries the admin's
  //    auth header; a plain <a href> to the API would hit it unauthenticated. ──
  downloadingResumeId = signal<string | null>(null);

  downloadResume(p: AdminPartner) {
    if (!p.hasResume || this.downloadingResumeId()) return;
    this.downloadingResumeId.set(p.id);
    this.admin.partnerResume(p.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = p.resumeFileName || `${p.name}-resume`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloadingResumeId.set(null);
      },
      error: (e: any) => {
        this.downloadingResumeId.set(null);
        // responseType 'blob' means error bodies come back as a Blob too, not
        // parsed JSON — read it as text ourselves to surface the backend's
        // actual message (e.g. "resume file is missing from storage") instead
        // of a generic fallback.
        if (e?.error instanceof Blob) {
          e.error.text().then((text: string) => {
            try {
              this.partnersError.set(JSON.parse(text)?.message ?? 'Could not download this resume.');
            } catch {
              this.partnersError.set('Could not download this resume.');
            }
          }).catch(() => this.partnersError.set('Could not download this resume.'));
        } else {
          this.partnersError.set(e?.error?.message ?? e?.error?.error ?? 'Could not download this resume.');
        }
      }
    });
  }

  /** "Reset" in the Users table doesn't send anything itself — it just jumps to
   *  the Reset Password tab with the email prefilled, so the admin still has to
   *  hit Send there to actually trigger it. */
  goToResetWithEmail(email: string) {
    this.email.set(email);
    this.sent.set(false);
    this.error.set('');
    this.tab.set('reset');
  }

  // ── Block / unblock a user ───────────────────────────────────
  blockingUserId = signal<string | null>(null);

  toggleBlock(u: AdminUser) {
    if (this.blockingUserId()) return;
    this.blockingUserId.set(u.id);

    const request = u.active ? this.admin.blacklistUser(u.id) : this.admin.unblacklistUser(u.id);
    request.subscribe({
      next: () => {
        this.users.update(rows => rows.map(row => row.id === u.id ? { ...row, active: !u.active } : row));
        this.blockingUserId.set(null);
      },
      error: (e: any) => {
        this.usersError.set(e?.error?.message ?? e?.error?.error ?? 'Could not update this user\'s status.');
        this.blockingUserId.set(null);
      }
    });
  }

  // ── User search ───────────────────────────────────────────────
  updateUserSearch(value: string) {
    this.userSearch.set(value);
    this.usersPage.set(1);
  }

  // ── Payment reminders ────────────────────────────────────────
  pending(p: AdminPayment): boolean {
    return p.status !== 'PAID' && p.status !== 'FAILED' && p.status !== 'ABANDONED';
  }

  selectedPaymentIds = signal<Set<string>>(new Set());
  reminderSending = signal(false);
  reminderMessage = signal('');

  togglePaymentSelection(id: string) {
    this.selectedPaymentIds.update(current => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  sendReminder(p: AdminPayment) {
    if (this.reminderSending()) return;
    this.reminderSending.set(true);
    this.reminderMessage.set('');
    this.paymentsError.set('');
    this.admin.sendPaymentReminder(p.id).subscribe({
      next: () => { this.reminderMessage.set(`Reminder sent to ${p.userEmail}.`); this.reminderSending.set(false); },
      error: (e: any) => {
        this.paymentsError.set(e?.error?.message ?? e?.error?.error ?? 'Could not send reminder.');
        this.reminderSending.set(false);
      }
    });
  }

  sendBulkReminders() {
    const ids = Array.from(this.selectedPaymentIds());
    if (!ids.length || this.reminderSending()) return;
    this.reminderSending.set(true);
    this.reminderMessage.set('');
    this.paymentsError.set('');
    this.admin.sendPaymentReminders(ids).subscribe({
      next: () => {
        this.reminderMessage.set(`Reminders sent to ${ids.length} user${ids.length === 1 ? '' : 's'}.`);
        this.selectedPaymentIds.set(new Set());
        this.reminderSending.set(false);
      },
      error: (e: any) => {
        this.paymentsError.set(e?.error?.message ?? e?.error?.error ?? 'Could not send reminders.');
        this.reminderSending.set(false);
      }
    });
  }

  // ── Resend an invoice for any paid order (last two years) ────────
  invoiceSendingId = signal<string | null>(null);
  invoiceMessage = signal('');

  sendInvoice(p: AdminPayment) {
    if (this.invoiceSendingId()) return;
    this.invoiceSendingId.set(p.id);
    this.invoiceMessage.set('');
    this.paymentsError.set('');
    this.admin.resendInvoice(p.id).subscribe({
      next: () => { this.invoiceMessage.set(`Invoice sent to ${p.userEmail}.`); this.invoiceSendingId.set(null); },
      error: (e: any) => {
        this.paymentsError.set(e?.error?.message ?? e?.error?.error ?? 'Could not send invoice.');
        this.invoiceSendingId.set(null);
      }
    });
  }

  // ── Send invoice for a specific test session (Tests tab) ─────────
  testInvoiceSendingId = signal<string | null>(null);
  testInvoiceMessage = signal('');

  sendTestInvoice(t: AdminTestSession) {
    if (this.testInvoiceSendingId()) return;
    this.testInvoiceSendingId.set(t.id);
    this.testInvoiceMessage.set('');
    this.testsError.set('');
    this.admin.resendInvoiceForTest(t.id).subscribe({
      next: () => { this.testInvoiceMessage.set(`Invoice sent to ${t.userEmail}.`); this.testInvoiceSendingId.set(null); },
      error: (e: any) => {
        this.testsError.set(e?.error?.message ?? e?.error?.error ?? 'Could not send invoice.');
        this.testInvoiceSendingId.set(null);
      }
    });
  }

  // ── Permanent fee discount (0-100%, per account) ──────────────
  feeDiscountEditingId = signal<string | null>(null);
  feeDiscountDraft = signal(0);
  feeDiscountSavingId = signal<string | null>(null);
  feeDiscountError = signal('');

  startEditFeeDiscount(u: AdminUser) {
    this.feeDiscountEditingId.set(u.id);
    this.feeDiscountDraft.set(u.feeDiscountPercent);
    this.feeDiscountError.set('');
  }

  cancelEditFeeDiscount() {
    this.feeDiscountEditingId.set(null);
    this.feeDiscountError.set('');
  }

  // ── Revoke confirmation — the × on the discount badge opens this instead
  //    of removing straight away, so a misclick can't silently wipe a
  //    discount off someone's account. ───────────────────────────────
  feeDiscountConfirmTarget = signal<AdminUser | null>(null);

  confirmRemoveFeeDiscount(u: AdminUser) {
    this.feeDiscountConfirmTarget.set(u);
    this.feeDiscountError.set('');
  }

  cancelRemoveFeeDiscount() {
    if (this.feeDiscountSavingId()) return;
    this.feeDiscountConfirmTarget.set(null);
    this.feeDiscountError.set('');
  }

  /** Clears the discount straight back to 0%, called only from the confirm modal. */
  removeFeeDiscount(u: AdminUser) {
    if (this.feeDiscountSavingId()) return;
    this.feeDiscountSavingId.set(u.id);
    this.feeDiscountError.set('');
    this.admin.setFeeDiscount(u.id, 0).subscribe({
      next: () => {
        this.users.update(rows => rows.map(row => row.id === u.id ? { ...row, feeDiscountPercent: 0 } : row));
        this.feeDiscountSavingId.set(null);
        this.feeDiscountConfirmTarget.set(null);
      },
      error: (e: any) => {
        this.feeDiscountError.set(e?.error?.message ?? e?.error?.error ?? 'Could not remove fee discount.');
        this.feeDiscountSavingId.set(null);
      }
    });
  }

  saveFeeDiscount(u: AdminUser) {
    if (this.feeDiscountSavingId()) return;
    const pct = this.feeDiscountDraft();
    if (pct == null || isNaN(pct) || pct < 0 || pct > 100) {
      this.feeDiscountError.set('Discount must be a number between 0 and 100.');
      return;
    }
    this.feeDiscountError.set('');
    this.feeDiscountSavingId.set(u.id);
    this.usersError.set('');
    this.admin.setFeeDiscount(u.id, pct).subscribe({
      next: () => {
        this.users.update(rows => rows.map(row => row.id === u.id ? { ...row, feeDiscountPercent: pct } : row));
        this.feeDiscountSavingId.set(null);
        this.feeDiscountEditingId.set(null);
      },
      error: (e: any) => {
        this.usersError.set(e?.error?.message ?? e?.error?.error ?? 'Could not update fee discount.');
        this.feeDiscountSavingId.set(null);
      }
    });
  }
}

function totalPages(length: number): number {
  return Math.max(1, Math.ceil(length / PAGE_SIZE));
}

function pageSlice<T>(rows: T[], page: number): T[] {
  const start = (page - 1) * PAGE_SIZE;
  return rows.slice(start, start + PAGE_SIZE);
}
