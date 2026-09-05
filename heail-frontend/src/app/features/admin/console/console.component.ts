import { Component, OnInit, OnDestroy, AfterViewChecked, ViewChild, ElementRef, signal, computed, inject, WritableSignal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { AdminPartner, AdminPayment, AdminTestSession, AdminUser, DiscountCoupon, EmailTemplate, InvoiceCounter } from '../../../core/models/admin.models';

type Tab = 'reset' | 'tests' | 'payments' | 'users' | 'logins' | 'partners' | 'coupons' | 'invoice' | 'email';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-admin-console',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './console.component.html',
  styleUrl: './console.component.css'
})
export class AdminConsoleComponent implements OnInit, AfterViewChecked, OnDestroy {
  private auth = inject(AuthService);
  private admin = inject(AdminService);

  tab = signal<Tab>('users');

  ngOnInit() {
    this.loadUsers();
  }

  ngAfterViewChecked() {
    this.syncEmailEditorHeight();
  }

  ngOnDestroy() {
    this.emailEditorResizeObserver?.disconnect();
  }

  // ── Email-templates tab: the template list is height-matched to the editor
  //    panel via ResizeObserver (the editor's own height is left alone — it
  //    never scrolls — and varies per template with placeholder count), so
  //    the list ends exactly where the editor's buttons do and scrolls
  //    internally instead. getBoundingClientRect (not entry.contentRect,
  //    which excludes padding/border) because .formwrap carries 42px of
  //    padding plus a border, and both panels are border-box sized. ──────
  @ViewChild('emailEditorPanel') emailEditorPanel?: ElementRef<HTMLElement>;
  emailListHeightPx = signal<number | null>(null);
  private emailEditorResizeObserver?: ResizeObserver;
  private observedEmailEditorEl?: HTMLElement;

  private syncEmailEditorHeight() {
    const el = this.emailEditorPanel?.nativeElement;
    if (el === this.observedEmailEditorEl) return;

    this.emailEditorResizeObserver?.disconnect();
    this.observedEmailEditorEl = el;

    if (!el) { this.emailListHeightPx.set(null); return; }

    this.emailEditorResizeObserver = new ResizeObserver(() => {
      this.emailListHeightPx.set(Math.round(el.getBoundingClientRect().height));
    });
    this.emailEditorResizeObserver.observe(el);
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

  // ── Tests (last N months) — paged + searched server-side (see
  //    AdminService.tests / the backend AdminDashboardService) rather than
  //    fetching every session in the window and slicing it in the browser. ──
  testsMonths = signal(3);
  tests = signal<AdminTestSession[]>([]);
  pagedTests = computed(() => this.tests());
  testsLoading = signal(false);
  testsError = signal('');
  testsLoaded = false;
  testsPage = signal(1);
  testsTotalPages = signal(1);
  testsSearch = signal('');
  private testsSearchTimer?: ReturnType<typeof setTimeout>;
  updateTestsSearch(value: string) {
    this.testsSearch.set(value);
    this.testsPage.set(1);
    clearTimeout(this.testsSearchTimer);
    this.testsSearchTimer = setTimeout(() => this.loadTests(), 300);
  }

  // ── Payments (last N months) — 24 so admin can always see, and resend
  //    the invoice for, any paid order from the last two years (matching
  //    the backend's own resend-invoice window). Paged + searched server-side. ──
  paymentsMonths = signal(24);
  payments = signal<AdminPayment[]>([]);
  pagedPayments = computed(() => this.payments());
  paymentsLoading = signal(false);
  paymentsError = signal('');
  paymentsLoaded = false;
  paymentsPage = signal(1);
  paymentsTotalPages = signal(1);
  paymentsSearch = signal('');
  private paymentsSearchTimer?: ReturnType<typeof setTimeout>;
  updatePaymentsSearch(value: string) {
    this.paymentsSearch.set(value);
    this.paymentsPage.set(1);
    clearTimeout(this.paymentsSearchTimer);
    this.paymentsSearchTimer = setTimeout(() => this.loadPayments(), 300);
  }

  // ── Registered users, chronological — paged + searched server-side. ──
  users = signal<AdminUser[]>([]);
  pagedUsers = computed(() => this.users());
  usersLoading = signal(false);
  usersError = signal('');
  usersLoaded = false;
  usersPage = signal(1);
  usersTotalPages = signal(1);
  userSearch = signal('');
  private userSearchTimer?: ReturnType<typeof setTimeout>;

  // ── Logged-in users (last N months) — paged + searched server-side. ──
  loginsMonths = signal(12);
  logins = signal<AdminUser[]>([]);
  pagedLogins = computed(() => this.logins());
  loginsLoading = signal(false);
  loginsError = signal('');
  loginsLoaded = false;
  loginsPage = signal(1);
  loginsTotalPages = signal(1);
  loginsSearch = signal('');
  private loginsSearchTimer?: ReturnType<typeof setTimeout>;
  updateLoginsSearch(value: string) {
    this.loginsSearch.set(value);
    this.loginsPage.set(1);
    clearTimeout(this.loginsSearchTimer);
    this.loginsSearchTimer = setTimeout(() => this.loadLogins(), 300);
  }

  // ── Partner applications, chronological — paged + searched server-side. ──
  partners = signal<AdminPartner[]>([]);
  pagedPartners = computed(() => this.partners());
  partnersLoading = signal(false);
  partnersError = signal('');
  partnersLoaded = false;
  partnersPage = signal(1);
  partnersTotalPages = signal(1);
  partnersSearch = signal('');
  private partnersSearchTimer?: ReturnType<typeof setTimeout>;
  updatePartnersSearch(value: string) {
    this.partnersSearch.set(value);
    this.partnersPage.set(1);
    clearTimeout(this.partnersSearchTimer);
    this.partnersSearchTimer = setTimeout(() => this.loadPartners(), 300);
  }

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

  /** Clamps to range, then (for server-paged tabs) re-fetches that page — a no-op if the page didn't change.
   *  `reload` is omitted for Coupons, which still paginates a client-side list. */
  setPage(pageSignal: WritableSignal<number>, page: number, totalPages: number, reload?: () => void) {
    const clamped = Math.min(Math.max(1, page), totalPages);
    if (clamped === pageSignal()) return;
    pageSignal.set(clamped);
    reload?.();
  }

  selectTab(t: Tab) {
    this.tab.set(t);
    if (t === 'tests' && !this.testsLoaded) this.loadTests();
    if (t === 'payments' && !this.paymentsLoaded) this.loadPayments();
    if (t === 'users' && !this.usersLoaded) this.loadUsers();
    if (t === 'logins' && !this.loginsLoaded) this.loadLogins();
    if (t === 'partners' && !this.partnersLoaded) this.loadPartners();
    if (t === 'coupons' && !this.couponsLoaded) this.loadCoupons();
    if (t === 'invoice' && !this.invoiceLoaded) this.loadInvoiceCounter();
    if (t === 'email' && !this.emailLoaded) this.loadEmailTemplates();
  }

  // ── Editable transactional-email wording ─────────────────────
  emailTemplates = signal<EmailTemplate[]>([]);
  emailLoading = signal(false);
  emailError = signal('');
  emailLoaded = false;

  selectedTemplateKey = signal<string | null>(null);
  templateSubjectDraft = signal('');
  templateBodyDraft = signal('');
  savingTemplate = signal(false);
  resettingTemplate = signal(false);
  sendingTest = signal(false);
  templateMessage = signal('');

  selectedTemplate = computed(() =>
    this.emailTemplates().find(t => t.key === this.selectedTemplateKey()) ?? null);

  templateDirty = computed(() => {
    const t = this.selectedTemplate();
    return !!t && (this.templateSubjectDraft() !== t.subject || this.templateBodyDraft() !== t.body);
  });

  loadEmailTemplates() {
    this.emailLoading.set(true);
    this.emailError.set('');
    this.admin.emailTemplates().subscribe({
      next: rows => {
        this.emailTemplates.set(rows);
        this.emailLoading.set(false);
        this.emailLoaded = true;
        if (!this.selectedTemplateKey() && rows.length) this.selectTemplate(rows[0].key);
        else this.syncTemplateDrafts();
      },
      error: (e: any) => {
        this.emailError.set(e?.error?.message ?? e?.error?.error ?? 'Could not load email templates.');
        this.emailLoading.set(false);
      }
    });
  }

  selectTemplate(key: string) {
    this.selectedTemplateKey.set(key);
    this.templateMessage.set('');
    this.emailError.set('');
    this.syncTemplateDrafts();
  }

  private syncTemplateDrafts() {
    const t = this.selectedTemplate();
    this.templateSubjectDraft.set(t?.subject ?? '');
    this.templateBodyDraft.set(t?.body ?? '');
  }

  saveTemplate() {
    const t = this.selectedTemplate();
    if (!t || this.savingTemplate()) return;
    const subject = this.templateSubjectDraft().trim();
    const body = this.templateBodyDraft();
    if (!subject || !body.trim()) {
      this.emailError.set('Subject and body are both required.');
      return;
    }
    this.savingTemplate.set(true);
    this.emailError.set('');
    this.templateMessage.set('');
    this.admin.updateEmailTemplate(t.key, subject, body).subscribe({
      next: updated => {
        this.emailTemplates.update(rows => rows.map(r => r.key === updated.key ? updated : r));
        this.savingTemplate.set(false);
        this.templateMessage.set('Saved.');
        this.syncTemplateDrafts();
      },
      error: (e: any) => {
        this.emailError.set(e?.error?.message ?? e?.error?.error ?? 'Could not save this template.');
        this.savingTemplate.set(false);
      }
    });
  }

  resetTemplate() {
    const t = this.selectedTemplate();
    if (!t || this.resettingTemplate() || !t.overridden) return;
    this.resettingTemplate.set(true);
    this.emailError.set('');
    this.templateMessage.set('');
    this.admin.resetEmailTemplate(t.key).subscribe({
      next: updated => {
        this.emailTemplates.update(rows => rows.map(r => r.key === updated.key ? updated : r));
        this.resettingTemplate.set(false);
        this.templateMessage.set('Reset to the built-in default.');
        this.syncTemplateDrafts();
      },
      error: (e: any) => {
        this.emailError.set(e?.error?.message ?? e?.error?.error ?? 'Could not reset this template.');
        this.resettingTemplate.set(false);
      }
    });
  }

  sendTemplateTest() {
    const t = this.selectedTemplate();
    if (!t || this.sendingTest()) return;
    this.sendingTest.set(true);
    this.emailError.set('');
    this.templateMessage.set('');
    this.admin.testEmailTemplate(t.key).subscribe({
      next: res => { this.templateMessage.set(res.message); this.sendingTest.set(false); },
      error: (e: any) => {
        this.emailError.set(e?.error?.message ?? e?.error?.error ?? 'Could not send the test email.');
        this.sendingTest.set(false);
      }
    });
  }

  // ── Shared invoice-number counter ────────────────────────────
  // Both website-generated invoices and manual/offline ones draw from a single
  // Postgres sequence, so their numbers never collide. This tab lets the
  // superadmin read the counter, take the next number for a manual invoice, and
  // correct the counter (e.g. after issuing a batch of manual invoices).
  invoiceCounter = signal<InvoiceCounter | null>(null);
  invoiceLoading = signal(false);
  invoiceError = signal('');
  invoiceLoaded = false;

  takingNumber = signal(false);
  /** Kept on screen after "take next number" so it can be copied onto the manual invoice. */
  takenNumber = signal('');

  showSetCounter = signal(false);
  setCounterDraft = signal<number | null>(null);
  settingCounter = signal(false);
  setCounterConfirm = signal(false);

  loadInvoiceCounter() {
    this.invoiceLoading.set(true);
    this.invoiceError.set('');
    this.admin.invoiceCounter().subscribe({
      next: c => { this.invoiceCounter.set(c); this.invoiceLoading.set(false); this.invoiceLoaded = true; },
      error: (e: any) => {
        this.invoiceError.set(e?.error?.message ?? e?.error?.error ?? 'Could not load the invoice counter.');
        this.invoiceLoading.set(false);
      }
    });
  }

  takeNextInvoiceNumber() {
    if (this.takingNumber()) return;
    this.takingNumber.set(true);
    this.invoiceError.set('');
    this.admin.takeNextInvoiceNumber().subscribe({
      next: res => {
        this.takenNumber.set(res.invoiceNumber);
        this.takingNumber.set(false);
        this.loadInvoiceCounter();
      },
      error: (e: any) => {
        this.invoiceError.set(e?.error?.message ?? e?.error?.error ?? 'Could not get the next invoice number.');
        this.takingNumber.set(false);
      }
    });
  }

  copyTakenNumber() {
    const n = this.takenNumber();
    if (n) navigator.clipboard?.writeText(n).catch(() => {});
  }

  openSetCounter() {
    this.showSetCounter.set(true);
    this.setCounterDraft.set(this.invoiceCounter()?.nextValue ?? null);
    this.setCounterConfirm.set(false);
    this.invoiceError.set('');
  }

  cancelSetCounter() {
    if (this.settingCounter()) return;
    this.showSetCounter.set(false);
    this.setCounterConfirm.set(false);
  }

  requestSetCounter() {
    const n = this.setCounterDraft();
    if (n == null || isNaN(n) || n < 1) {
      this.invoiceError.set('Enter a whole number of 1 or more.');
      return;
    }
    this.invoiceError.set('');
    this.setCounterConfirm.set(true);
  }

  confirmSetCounter() {
    const n = this.setCounterDraft();
    if (n == null || this.settingCounter()) return;
    this.settingCounter.set(true);
    this.invoiceError.set('');
    this.admin.setInvoiceCounter(n).subscribe({
      next: c => {
        this.invoiceCounter.set(c);
        this.settingCounter.set(false);
        this.showSetCounter.set(false);
        this.setCounterConfirm.set(false);
      },
      error: (e: any) => {
        this.invoiceError.set(e?.error?.message ?? e?.error?.error ?? 'Could not set the invoice counter.');
        this.settingCounter.set(false);
        this.setCounterConfirm.set(false);
      }
    });
  }

  loadTests() {
    this.testsLoading.set(true);
    this.testsError.set('');
    this.admin.tests(this.testsMonths(), this.testsPage() - 1, PAGE_SIZE, this.testsSearch().trim()).subscribe({
      next: res => {
        this.tests.set(res.content);
        this.testsTotalPages.set(res.totalPages);
        this.testsLoading.set(false);
        this.testsLoaded = true;
      },
      error: (e: any) => {
        this.testsError.set(e?.error?.message ?? e?.error?.error ?? 'Could not load test activity.');
        this.testsLoading.set(false);
      }
    });
  }

  loadPayments() {
    this.paymentsLoading.set(true);
    this.paymentsError.set('');
    this.admin.payments(this.paymentsMonths(), this.paymentsPage() - 1, PAGE_SIZE, this.paymentsSearch().trim()).subscribe({
      next: res => {
        this.payments.set(res.content);
        this.paymentsTotalPages.set(res.totalPages);
        this.paymentsLoading.set(false);
        this.paymentsLoaded = true;
      },
      error: (e: any) => {
        this.paymentsError.set(e?.error?.message ?? e?.error?.error ?? 'Could not load payments.');
        this.paymentsLoading.set(false);
      }
    });
  }

  loadUsers() {
    this.usersLoading.set(true);
    this.usersError.set('');
    this.admin.users(this.usersPage() - 1, PAGE_SIZE, this.userSearch().trim()).subscribe({
      next: res => {
        this.users.set(res.content);
        this.usersTotalPages.set(res.totalPages);
        this.usersLoading.set(false);
        this.usersLoaded = true;
      },
      error: (e: any) => {
        this.usersError.set(e?.error?.message ?? e?.error?.error ?? 'Could not load users.');
        this.usersLoading.set(false);
      }
    });
  }

  loadLogins() {
    this.loginsLoading.set(true);
    this.loginsError.set('');
    this.admin.logins(this.loginsMonths(), this.loginsPage() - 1, PAGE_SIZE, this.loginsSearch().trim()).subscribe({
      next: res => {
        this.logins.set(res.content);
        this.loginsTotalPages.set(res.totalPages);
        this.loginsLoading.set(false);
        this.loginsLoaded = true;
      },
      error: (e: any) => {
        this.loginsError.set(e?.error?.message ?? e?.error?.error ?? 'Could not load login activity.');
        this.loginsLoading.set(false);
      }
    });
  }

  loadPartners() {
    this.partnersLoading.set(true);
    this.partnersError.set('');
    this.admin.partners(this.partnersPage() - 1, PAGE_SIZE, this.partnersSearch().trim()).subscribe({
      next: res => {
        this.partners.set(res.content);
        this.partnersTotalPages.set(res.totalPages);
        this.partnersLoading.set(false);
        this.partnersLoaded = true;
      },
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
    clearTimeout(this.userSearchTimer);
    this.userSearchTimer = setTimeout(() => this.loadUsers(), 300);
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
