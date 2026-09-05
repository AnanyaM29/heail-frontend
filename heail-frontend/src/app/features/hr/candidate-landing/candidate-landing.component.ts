import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HrCandidateAccessService } from '../../../core/services/hr-candidate-access.service';
import { AuthService } from '../../../core/services/auth.service';
import { FRESH_AUTH_KEY, clearTestAuthMarkers } from '../../../core/guards/auth.guard';

/** Public landing page for a candidate's emailed access link — no HEAIL
 *  account or login involved. See HrCandidateAccessService (backend) for
 *  why: the token itself is the credential, and "Begin" exchanges it for a
 *  normal JWT behind the scenes, same as any other login, so everything
 *  downstream (my-assessments, the HR player) is unmodified.
 *
 *  On load this ends whatever session already exists on the device — the
 *  buyer who registered the candidate is often the one who forwards/opens
 *  the link, and the candidate must take the assessment as themselves, not
 *  under the buyer's session. */
@Component({
  selector: 'app-candidate-landing',
  standalone: true,
  templateUrl: './candidate-landing.component.html',
  styleUrl: './candidate-landing.component.css'
})
export class CandidateLandingComponent implements OnInit {
  private access = inject(HrCandidateAccessService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  token = this.route.snapshot.paramMap.get('token')!;

  loading = signal(true);
  error = signal('');
  candidateName = signal('');
  assessmentNames = signal<string[]>([]);
  agreed = signal(false);
  starting = signal(false);

  ngOnInit() {
    // Whoever is logged in on this device is not the candidate — end that
    // session so nothing bleeds through into the assessment.
    this.auth.clearSession();
    clearTestAuthMarkers();

    this.access.tokenInfo(this.token).subscribe({
      next: res => {
        this.candidateName.set(res.candidateName);
        this.assessmentNames.set(res.assessmentNames);
        this.agreed.set(res.termsAccepted);
        this.loading.set(false);
      },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  begin() {
    if (!this.agreed() || this.starting()) return;
    this.starting.set(true);
    this.error.set('');

    this.access.acceptTerms(this.token).subscribe({
      next: () => {
        this.access.redeem(this.token).subscribe({
          next: res => {
            this.auth.applyAuthResponse(res);
            // Mark this as a candidate token session so assessmentEntryGuard
            // lets them into the player without a password re-login they don't have.
            try { sessionStorage.setItem(FRESH_AUTH_KEY, '1'); } catch {}
            this.router.navigate(['/hr/my-assessments']);
          },
          error: (e: any) => { this.starting.set(false); this.error.set(this.msg(e)); }
        });
      },
      error: (e: any) => { this.starting.set(false); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'This link may have expired. Please contact whoever invited you.';
  }
}
