import { Component, OnInit, signal, computed, inject, WritableSignal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { AdminPayment, AdminTestSession, AdminUser } from '../../../core/models/admin.models';

type Tab = 'reset' | 'tests' | 'payments' | 'users' | 'logins';

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
  testsTotalPages = computed(() => totalPages(this.tests().length));
  pagedTests = computed(() => pageSlice(this.tests(), this.testsPage()));

  // ── Payments (last N months) ─────────────────────────────────
  paymentsMonths = signal(12);
  payments = signal<AdminPayment[]>([]);
  paymentsLoading = signal(false);
  paymentsError = signal('');
  paymentsLoaded = false;
  paymentsPage = signal(1);
  paymentsTotalPages = computed(() => totalPages(this.payments().length));
  pagedPayments = computed(() => pageSlice(this.payments(), this.paymentsPage()));

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
  loginsTotalPages = computed(() => totalPages(this.logins().length));
  pagedLogins = computed(() => pageSlice(this.logins(), this.loginsPage()));

  setPage(pageSignal: WritableSignal<number>, page: number, totalPages: number) {
    pageSignal.set(Math.min(Math.max(1, page), totalPages));
  }

  selectTab(t: Tab) {
    this.tab.set(t);
    if (t === 'tests' && !this.testsLoaded) this.loadTests();
    if (t === 'payments' && !this.paymentsLoaded) this.loadPayments();
    if (t === 'users' && !this.usersLoaded) this.loadUsers();
    if (t === 'logins' && !this.loginsLoaded) this.loadLogins();
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
}

function totalPages(length: number): number {
  return Math.max(1, Math.ceil(length / PAGE_SIZE));
}

function pageSlice<T>(rows: T[], page: number): T[] {
  const start = (page - 1) * PAGE_SIZE;
  return rows.slice(start, start + PAGE_SIZE);
}
