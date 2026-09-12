import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssessmentService } from '../../../core/services/assessment.service';
import { LeaderResult, SessionResumeResponse } from '../../../core/models/assessment.models';
import { FRESH_AUTH_KEY } from '../../../core/guards/auth.guard';

const DOMAIN_LABELS: Record<string, string> = {
  I: 'Leadership & Vision',
  II: 'Decision-Making & Strategy',
  III: 'Team Management & Culture',
  IV: 'Personal Mastery & EQ',
  V: 'Ethics, Purpose & Resilience'
};

@Component({
  selector: 'app-leader-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class LeaderDashboardComponent implements OnInit {
  private assessment = inject(AssessmentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  starting = signal(false);
  error = signal('');
  noEntitlement = signal(false);
  entitled = signal(false);
  entitlementChecked = signal(false);

  currentSession = signal<SessionResumeResponse | null>(null);
  results = signal<LeaderResult[]>([]);

  /** Which attempt's history row was clicked (id), via the `?result=` query
   *  param — so the link is shareable/bookmarkable and survives a refresh. */
  selectedId = signal<string | null>(null);

  /** The attempt currently on screen: the one selected from history, or the
   *  most recent if nothing's been picked. Despite the name, this is NOT
   *  always the newest attempt — see selectedId. */
  latest = computed(() => {
    const list = this.results();
    if (list.length === 0) return null;
    const id = this.selectedId();
    return (id && list.find(r => r.id === id)) || list[0];
  });
  domainEntries = computed(() => {
    const r = this.latest();
    return r ? Object.entries(r.domainScores) : [];
  });

  ngOnInit() {
    // Reactive, not a one-off snapshot read: clicking a different history row
    // re-navigates to the same route with a new query param, which Angular
    // reuses this component instance for (ngOnInit won't refire) but does
    // push through this observable.
    this.route.queryParamMap.subscribe(params => this.selectedId.set(params.get('result')));
    this.assessment.current().subscribe({
      next: session => { this.currentSession.set(session); this.loadResults(); },
      error: () => this.loadResults()
    });
  }

  /** Clicking a row in "Attempt history" shows that attempt above instead of
   *  always the latest one. */
  viewAttempt(r: LeaderResult) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { result: r.id }, queryParamsHandling: 'merge' });
  }

  /** No toolbar/location/menu bar — a stripped-down popup window instead of a
   *  normal tab, so there's no address bar to navigate away in and no tab
   *  strip to switch out of. Sized to fill the screen so it reads as a
   *  dedicated window rather than a small floating box. */
  private static readonly LOCKDOWN_FEATURES =
    `toolbar=no,location=no,menubar=no,status=no,directories=no,resizable=no,scrollbars=yes,` +
    `width=${screen.availWidth},height=${screen.availHeight},left=0,top=0`;

  startAssessment() {
    this.starting.set(true);
    this.error.set('');
    this.noEntitlement.set(false);
    // This is an in-app start by an already-signed-in user — mark the session as
    // fresh-authed BEFORE opening the popup so it inherits the marker (sessionStorage
    // is cloned into the new window at open time) and assessmentEntryGuard lets it
    // straight in instead of bouncing to /login. Email links still force re-login
    // via /take-test/:dest → forceTestLoginGuard, which clears this marker.
    this.markFreshAuth();
    // Opens in a locked-down window on purpose — separate from the browsable
    // main site (see testExitGuard/beforeunload in AssessmentPlayerComponent).
    // Must call window.open() synchronously, inside this click handler, or
    // browsers block it as an unrequested popup — the target URL isn't known
    // yet, so open blank and redirect it once the session-start call comes back.
    const testWindow = window.open('', '_blank', LeaderDashboardComponent.LOCKDOWN_FEATURES);
    this.assessment.start().subscribe({
      next: res => {
        this.starting.set(false);
        const url = this.router.createUrlTree(['/leader/assessment', res.sessionId]).toString();
        if (testWindow) testWindow.location.href = url; else window.open(url, '_blank', LeaderDashboardComponent.LOCKDOWN_FEATURES);
      },
      error: (e: any) => {
        this.starting.set(false);
        testWindow?.close();
        if (e?.status === 403) this.noEntitlement.set(true);
        else this.error.set(this.msg(e));
      }
    });
  }

  resumeAssessment() {
    const s = this.currentSession();
    if (!s) return;
    this.markFreshAuth();
    const url = this.router.createUrlTree(['/leader/assessment', s.sessionId]).toString();
    window.open(url, '_blank', LeaderDashboardComponent.LOCKDOWN_FEATURES);
  }

  /** In-app test launches happen for a user who is already signed in on this
   *  page, so entering the player must not bounce through /login. Setting this
   *  synchronously — before any window.open — means a popup opened right after
   *  inherits it in its cloned sessionStorage. */
  private markFreshAuth() {
    try { sessionStorage.setItem(FRESH_AUTH_KEY, '1'); } catch {}
  }

  domainLabel(code: string) {
    return DOMAIN_LABELS[code] ?? code;
  }

  private loadResults() {
    this.assessment.results().subscribe({
      next: r => {
        this.results.set(r);
        this.loading.set(false);
        // Only relevant before a first sitting: if the account holds an unused
        // entitlement and has no in-progress session, the "no results yet" view
        // offers "Start Assessment". There is no retake once a result exists.
        if (!this.currentSession()) this.checkEntitlement();
      },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  private checkEntitlement() {
    this.assessment.entitlement().subscribe({
      next: res => { this.entitled.set(res.entitled); this.entitlementChecked.set(true); },
      error: () => { this.entitled.set(false); this.entitlementChecked.set(true); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
