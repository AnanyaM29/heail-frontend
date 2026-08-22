import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AssessmentService } from '../../../core/services/assessment.service';
import { LeaderResult, SessionResumeResponse } from '../../../core/models/assessment.models';

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

  loading = signal(true);
  starting = signal(false);
  error = signal('');
  noEntitlement = signal(false);
  entitled = signal(false);
  entitlementChecked = signal(false);

  currentSession = signal<SessionResumeResponse | null>(null);
  results = signal<LeaderResult[]>([]);

  latest = computed(() => this.results()[0] ?? null);
  domainEntries = computed(() => {
    const r = this.latest();
    return r ? Object.entries(r.domainScores) : [];
  });

  ngOnInit() {
    this.assessment.current().subscribe({
      next: session => { this.currentSession.set(session); this.loadResults(); },
      error: () => this.loadResults()
    });
  }

  startAssessment() {
    this.starting.set(true);
    this.error.set('');
    this.noEntitlement.set(false);
    // Opens in a new window on purpose — a timed, locked-down test window
    // separate from the browsable main site (see testExitGuard/beforeunload
    // in AssessmentPlayerComponent). Must call window.open() synchronously,
    // inside this click handler, or browsers block it as an unrequested
    // popup — the target URL isn't known yet, so open blank and redirect it
    // once the session-start call comes back.
    const testWindow = window.open('', '_blank');
    this.assessment.start().subscribe({
      next: res => {
        this.starting.set(false);
        const url = this.router.createUrlTree(['/leader/assessment', res.sessionId]).toString();
        if (testWindow) testWindow.location.href = url; else window.open(url, '_blank');
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
    const url = this.router.createUrlTree(['/leader/assessment', s.sessionId]).toString();
    window.open(url, '_blank');
  }

  domainLabel(code: string) {
    return DOMAIN_LABELS[code] ?? code;
  }

  private loadResults() {
    this.assessment.results().subscribe({
      next: r => {
        this.results.set(r);
        this.loading.set(false);
        // Check entitlement whenever there's no in-progress session — even if
        // there are prior results. A user can legitimately buy the assessment
        // again after completing it once, which grants a fresh unused
        // entitlement; skipping this check whenever results already existed
        // meant a repeat purchase was never detected, and "Retake Assessment"
        // just kept sending the buyer back to the purchase page forever.
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
