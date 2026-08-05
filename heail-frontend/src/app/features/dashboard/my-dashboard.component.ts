import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { OrgOrderService } from '../../core/services/org-order.service';
import { MyDashboard } from '../../core/models/dashboard.models';
import { ConfirmService } from '../../shared/confirm/confirm.service';

/** Unified "home" for a logged-in account: shows every HEAIL activity tied to
 *  this person — organisations they administer, their own respondent progress
 *  in any org's pulse round, and their individual Leader (Gita Leader) results
 *  — regardless of which single role their account happens to carry. A person
 *  can legitimately have all three at once (e.g. an org admin who is also a
 *  respondent in their own or another organisation's round). */
@Component({
  selector: 'app-my-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, TitleCasePipe, RouterLink],
  templateUrl: './my-dashboard.component.html',
  styleUrl: './my-dashboard.component.css'
})
export class MyDashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private orgOrders = inject(OrgOrderService);
  private confirmSvc = inject(ConfirmService);

  loading = signal(true);
  error = signal('');
  data = signal<MyDashboard | null>(null);
  cancellingId = signal<string | null>(null);

  hasOrgs = computed(() => (this.data()?.organisationsAdministered.length ?? 0) > 0);
  hasRespondent = computed(() => (this.data()?.respondentMemberships.length ?? 0) > 0);
  hasLeader = computed(() =>
    (this.data()?.leaderResults.length ?? 0) > 0 || !!this.data()?.leaderInProgress);
  hasNothing = computed(() =>
    !this.loading() && !this.hasOrgs() && !this.hasRespondent() && !this.hasLeader());

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.dashboardService.getDashboard().subscribe({
      next: res => { this.data.set(res); this.loading.set(false); },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
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
