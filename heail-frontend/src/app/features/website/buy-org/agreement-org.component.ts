import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrgOrderService } from '../../../core/services/org-order.service';
import { OrgOrderResponse } from '../../../core/models/org-order.models';

const AGREEMENT_VERSION = 'v1';

type Stage = 'agreement' | 'payment' | 'thankyou';

@Component({
  selector: 'app-agreement-org',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './agreement-org.component.html'
})
export class AgreementOrgComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orgOrders = inject(OrgOrderService);

  orderId = this.route.snapshot.paramMap.get('id')!;

  data = signal<OrgOrderResponse | null>(null);
  loading = signal(true);
  actionLoading = signal(false);
  error = signal('');
  agreed = signal(false);

  stage = computed<Stage>(() => {
    const status = this.data()?.order.status;
    if (status === 'PAID') return 'thankyou';
    if (status === 'AGREEMENT_ACCEPTED' || status === 'PAYMENT_INITIATED') return 'payment';
    return 'agreement';
  });

  ngOnInit() {
    this.orgOrders.getOrder(this.orderId).subscribe({
      next: res => { this.data.set(res); this.loading.set(false); },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  proceedToPayment() {
    if (!this.agreed()) return;
    this.actionLoading.set(true);
    this.error.set('');
    this.orgOrders.acceptAgreement(this.orderId, AGREEMENT_VERSION).subscribe({
      next: res => { this.data.set(res); this.actionLoading.set(false); },
      error: (e: any) => { this.actionLoading.set(false); this.error.set(this.msg(e)); }
    });
  }

  pay() {
    this.actionLoading.set(true);
    this.error.set('');
    this.orgOrders.pay(this.orderId).subscribe({
      next: res => { this.data.set(res); this.actionLoading.set(false); },
      error: (e: any) => { this.actionLoading.set(false); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
