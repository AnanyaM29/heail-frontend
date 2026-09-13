import { Component, OnInit, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { HrAssessmentService } from '../../../core/services/hr-assessment.service';
import { HrAssignment } from '../../../core/models/hr.models';
import { FRESH_AUTH_KEY } from '../../../core/guards/auth.guard';

/** Where a candidate lands right after redeeming their access-link token
 *  (see candidate-landing.component.ts). Shows one card per ASSIGNMENT
 *  (entitlement) — never merged by pillar type, so the same pillar assigned to
 *  this person more than once (registered as a candidate on two separate
 *  orders) shows as two separate cards, never the full 7-pillar "buy more"
 *  catalogue hr-select.component.ts shows to buyers — and never a score, per
 *  the Candidate Terms (results go to the buyer only). */
@Component({
  selector: 'app-my-assessments',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './my-assessments.component.html',
  styleUrl: './my-assessments.component.css'
})
export class MyAssessmentsComponent implements OnInit {
  private hrAssessments = inject(HrAssessmentService);
  private router = inject(Router);

  loading = signal(true);
  error = signal('');
  assignments = signal<HrAssignment[]>([]);
  starting = signal<string | null>(null); // entitlementId currently starting

  ngOnInit() {
    this.hrAssessments.assignments().subscribe({
      next: rows => { this.assignments.set(rows); this.loading.set(false); },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  go(card: HrAssignment) {
    if (card.status === 'COMPLETED' || this.starting() !== null) return;

    // The signed-in candidate is on the page they were sent to take their test —
    // entering the player must not detour through /login. (redeem() sets this on
    // token redemption too; re-set here so a back-nav or refresh still works.)
    try { sessionStorage.setItem(FRESH_AUTH_KEY, '1'); } catch {}

    if (card.sessionId) {
      // Resuming an already-started assignment — no directions replay.
      this.router.navigate(['/hr/assessment', card.sessionId]);
      return;
    }

    // PENDING: start() is keyed by this exact assignment's entitlementId, so it
    // always starts THIS card, never some other pending assignment of the same
    // pillar. ?fresh=1 tells the player this is a genuinely new sitting, so it
    // shows the directions screen (each pillar is its own independent test).
    this.starting.set(card.entitlementId);
    this.hrAssessments.start(card.entitlementId).subscribe({
      next: res => this.router.navigate(['/hr/assessment', res.sessionId], { queryParams: { fresh: '1' } }),
      error: (e: any) => { this.starting.set(null); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
