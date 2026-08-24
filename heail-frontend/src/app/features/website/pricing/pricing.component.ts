import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LeaderPaymentComponent } from '../../leader/payment/payment.component';
import { BuyOrgFormComponent } from '../buy-org/buy-org-form.component';
import { AgreementOrgComponent } from '../buy-org/agreement-org.component';
import { HrSelectComponent } from '../../hr/select/hr-select.component';
import { CandidatesEntryComponent } from '../../hr/candidates-entry/candidates-entry.component';
import { HrPaymentComponent } from '../../hr/payment/hr-payment.component';

export type PricingTab = 'org' | 'leader' | 'hr' | 'students';
type OrgStage = 'none' | 'form' | 'agreement';
type HrStage = 'select' | 'candidates' | 'payment';

/** The whole Leader/Org/HR purchase experience lives on this one page now —
 *  no navigating to /pricing/buy-* routes from here. Those routes still
 *  exist (dashboards, retake links, etc. deep-link into them directly), but
 *  from the pricing page every flow renders inline via the same components
 *  in "embedded" mode, which emit events instead of calling router.navigate.
 *
 *  Leader and HR show their real picker/checkout content directly under
 *  their tab the moment it's selected — no separate summary-card-then-click
 *  step, since that was just an extra click to reach the exact same thing.
 *  Org keeps its summary cards + an explicit "Make Payment" click, since
 *  two of its three cards are "request a quote" (nothing to embed) and the
 *  employee-roster form is a heavier commitment than picking pillars. */
@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [RouterLink, LeaderPaymentComponent, BuyOrgFormComponent, AgreementOrgComponent, HrSelectComponent, CandidatesEntryComponent, HrPaymentComponent],
  templateUrl: './pricing.component.html'
})
export class PricingComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  activeTab = signal<PricingTab>('org');

  orgStage = signal<OrgStage>('none');
  orgOrderId = signal<string | null>(null);

  hrStage = signal<HrStage>('select');
  hrOrderId = signal<string | null>(null);

  setTab(tab: PricingTab) {
    if ((tab === 'leader' || tab === 'hr') && !this.requireLogin()) return;
    this.activeTab.set(tab);
    if (tab === 'hr') { this.hrStage.set('select'); this.hrOrderId.set(null); }
    if (tab === 'org') { this.orgStage.set('none'); this.orgOrderId.set(null); }
  }

  private requireLogin(): boolean {
    if (this.auth.isLoggedIn()) return true;
    this.router.navigate(['/login']);
    return false;
  }

  startOrg() {
    if (!this.requireLogin()) return;
    this.orgOrderId.set(null);
    this.orgStage.set('form');
  }
  onOrgOrderCreated(id: string) {
    this.orgOrderId.set(id);
    this.orgStage.set('agreement');
  }
  onOrgCancelled() {
    this.orgStage.set('none');
  }
  onOrgAgreementBack() {
    this.orgStage.set('form');
  }

  onHrOrderSelected(id: string) {
    this.hrOrderId.set(id);
    this.hrStage.set('candidates');
  }
  onHrCandidatesSaved() {
    this.hrStage.set('payment');
  }
  onHrCandidatesBack() {
    this.hrStage.set('select');
  }
  onHrPaymentBack() {
    this.hrStage.set('candidates');
  }
}
