import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { OrgOrderService } from '../../core/services/org-order.service';
import { HrAssessmentService } from '../../core/services/hr-assessment.service';
import { HrOrderService } from '../../core/services/hr-order.service';
import { AssessmentService } from '../../core/services/assessment.service';
import { MyDashboard } from '../../core/models/dashboard.models';
import { HrAssessment, HrResult, HrSessionResumeResponse } from '../../core/models/hr.models';
import { HrCandidateDto } from '../../core/models/hr-candidate.models';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { FRESH_AUTH_KEY } from '../../core/guards/auth.guard';

interface HrRow {
  assessment: HrAssessment;
  latestResult: HrResult | null;
  inProgress: HrSessionResumeResponse | null;
}

/** Unified "home" for a logged-in account. Everything is split into two clearly
 *  labelled groups so there's no confusion between the two hats a person can wear
 *  at once: things they BUY/SET UP FOR OTHERS (org pulse rounds they administer,
 *  HR assessments they've registered candidates for) and assessments assigned to
 *  THEM PERSONALLY to complete (pulse rounds they're a respondent in, their own
 *  Leader assessment, their own HR competency assessments). A single account can
 *  have activity in both groups (e.g. an org admin who is also a respondent). */
@Component({
  selector: 'app-my-dashboard',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, RouterLink],
  templateUrl: './my-dashboard.component.html',
  styleUrl: './my-dashboard.component.css'
})
export class MyDashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private orgOrders = inject(OrgOrderService);
  private confirmSvc = inject(ConfirmService);
  private hrAssessments = inject(HrAssessmentService);
  private hrOrders = inject(HrOrderService);
  private leaderAssessment = inject(AssessmentService);
  private router = inject(Router);

  // No toolbar/location/menu bar — a stripped-down popup window instead of a
  // normal tab, matching the Leader test player's lockdown window.
  private static readonly LOCKDOWN_FEATURES =
    `toolbar=no,location=no,menubar=no,status=no,directories=no,resizable=no,scrollbars=yes,` +
    `width=${screen.availWidth},height=${screen.availHeight},left=0,top=0`;

  loading = signal(true);
  error = signal('');
  data = signal<MyDashboard | null>(null);
  hrCandidates = signal<HrCandidateDto[]>([]);
  cancellingId = signal<string | null>(null);
  startingHr = signal<number | null>(null);
  startingLeader = signal(false);

  // ── "Managing for others" — bought / set up, not taken by this account ──
  hasOrgs = computed(() => (this.data()?.organisationsAdministered?.length ?? 0) > 0);
  hasHrCandidates = computed(() => this.hrCandidates().length > 0);
  hrCandidateResultCount = computed(() =>
    this.hrCandidates().filter(c => c.results.some(r => r.completed)).length);

  // ── "Your assessments to complete" — assigned to this account personally ──
  hasRespondent = computed(() => (this.data()?.respondentMemberships?.length ?? 0) > 0);
  hasLeader = computed(() =>
    (this.data()?.leaderResults?.length ?? 0) > 0 || !!this.data()?.leaderInProgress
    || !!this.data()?.leaderUnpaidOrder || !!this.data()?.leaderReadyToStart);

  // One row per pillar with any activity — entitled to take, mid-attempt, or
  // already has a result. A pillar nobody's ever bought or touched is left
  // out entirely; browsing/buying happens on /pricing/buy-hr instead.
  hrRows = computed<HrRow[]>(() => {
    const d = this.data();
    if (!d) return [];

    const latestByAssessment = new Map<number, HrResult>();
    for (const r of d.hrResults ?? []) {
      const existing = latestByAssessment.get(r.assessmentId);
      if (!existing || new Date(r.createdAt) > new Date(existing.createdAt)) latestByAssessment.set(r.assessmentId, r);
    }
    const inProgressByAssessment = new Map<number, HrSessionResumeResponse>();
    for (const s of d.hrInProgress ?? []) inProgressByAssessment.set(s.assessmentId, s);

    return (d.hrAssessments ?? [])
      .map(a => ({ assessment: a, latestResult: latestByAssessment.get(a.id) ?? null, inProgress: inProgressByAssessment.get(a.id) ?? null }))
      .filter(row => row.assessment.entitled || row.latestResult || row.inProgress);
  });
  hasHr = computed(() => this.hrRows().length > 0);

  hasManaging = computed(() => this.hasOrgs() || this.hasHrCandidates());
  hasOwn = computed(() => this.hasRespondent() || this.hasLeader() || this.hasHr());
  hasNothing = computed(() => !this.loading() && !this.hasManaging() && !this.hasOwn());

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.dashboardService.getDashboard().subscribe({
      next: res => { this.data.set(res); this.loading.set(false); },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
    // Separate call — HR buyers (candidates registered for others) aren't part of
    // the main dashboard payload. A failure here just leaves the "managing" group
    // without its HR card; it never blocks the rest of the dashboard.
    this.hrOrders.listMyCandidates().subscribe({
      next: rows => this.hrCandidates.set(rows ?? []),
      error: () => this.hrCandidates.set([]),
    });
  }

  /** Cancels a round that hasn't been paid for yet. The backend also refuses
   *  this once an order is PAID, but the button is only shown for unpaid
   *  ones in the template so that's a backstop, not the primary guard. */
  async cancelOrg(orderId: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const ok = await this.confirmSvc.ask({
      title: 'Cancel this round?',
      message: 'This discards its employees and cannot be undone.',
      confirmLabel: 'Cancel Round',
      cancelLabel: 'Keep It',
      danger: true
    });
    if (!ok) return;
    this.cancellingId.set(orderId);
    this.orgOrders.cancel(orderId).subscribe({
      next: () => { this.cancellingId.set(null); this.load(); },
      error: (e: any) => { this.cancellingId.set(null); this.error.set(this.msg(e)); }
    });
  }

  /** In-app test launches are for a user already signed in on the dashboard —
   *  mark the session fresh-authed BEFORE opening the popup so it inherits the
   *  marker (sessionStorage is cloned into the new window at open time) and
   *  assessmentEntryGuard admits it instead of bouncing to /login. Email links
   *  still force re-login via /take-test/:dest → forceTestLoginGuard. */
  private markFreshAuth() {
    try { sessionStorage.setItem(FRESH_AUTH_KEY, '1'); } catch {}
  }

  resumeHr(session: HrSessionResumeResponse) {
    this.markFreshAuth();
    const url = this.router.createUrlTree(['/hr/assessment', session.sessionId]).toString();
    window.open(url, '_blank', MyDashboardComponent.LOCKDOWN_FEATURES);
  }

  startHr(assessmentId: number) {
    if (this.startingHr()) return;
    this.startingHr.set(assessmentId);
    this.error.set('');
    this.markFreshAuth();
    // Must call window.open() synchronously, inside this click handler, or
    // browsers block it as an unrequested popup — open blank and redirect it
    // once the session-start call comes back.
    const testWindow = window.open('', '_blank', MyDashboardComponent.LOCKDOWN_FEATURES);
    this.hrAssessments.start(assessmentId).subscribe({
      next: res => {
        this.startingHr.set(null);
        const url = this.router.createUrlTree(['/hr/assessment', res.sessionId]).toString();
        if (testWindow) testWindow.location.href = url; else window.open(url, '_blank', MyDashboardComponent.LOCKDOWN_FEATURES);
      },
      error: (e: any) => {
        this.startingHr.set(null);
        testWindow?.close();
        this.error.set(this.msg(e));
      }
    });
  }

  startLeader() {
    if (this.startingLeader()) return;
    this.startingLeader.set(true);
    this.error.set('');
    this.markFreshAuth();
    // Open the window synchronously in the click handler, then redirect it once
    // the session-start call returns (same reason as startHr).
    const testWindow = window.open('', '_blank', MyDashboardComponent.LOCKDOWN_FEATURES);
    this.leaderAssessment.start().subscribe({
      next: res => {
        this.startingLeader.set(false);
        const url = this.router.createUrlTree(['/leader/assessment', res.sessionId]).toString();
        if (testWindow) testWindow.location.href = url; else window.open(url, '_blank', MyDashboardComponent.LOCKDOWN_FEATURES);
      },
      error: (e: any) => {
        this.startingLeader.set(false);
        testWindow?.close();
        this.error.set(this.msg(e));
      }
    });
  }

  pulseProgressPct(m: { pulsesCompleted: number; pulsesTotal: number }) {
    return m.pulsesTotal > 0 ? Math.round((m.pulsesCompleted / m.pulsesTotal) * 100) : 0;
  }

  /** Buckets any of the free-form status strings the API returns (order
   *  status, invitation status, band, etc.) into one of three badge colours,
   *  so new backend status values don't need a matching UI change. */
  statusTone(status: string): 'good' | 'warn' | 'bad' {
    const s = (status || '').toUpperCase();
    if (/(FAIL|ABANDON|UNDELIVER|REJECT)/.test(s)) return 'bad';
    if (/(PAID|COMPLET|ACCEPT|SENT|ADVANCED|MASTER)/.test(s)) return 'good';
    return 'warn';
  }

  statusLabel(status: string): string {
    return (status || '').replace(/_/g, ' ').replace(/\w\S*/g, w => w[0] + w.slice(1).toLowerCase());
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
