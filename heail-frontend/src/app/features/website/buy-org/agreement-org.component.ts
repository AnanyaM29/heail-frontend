import { Component, OnInit, signal, inject, computed, effect } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrgOrderService } from '../../../core/services/org-order.service';
import { OrgOrderResponse } from '../../../core/models/org-order.models';
import { PaypalLoaderService } from '../../../core/services/paypal-loader.service';

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
  private paypalLoader = inject(PaypalLoaderService);

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

  private paypalRendered = false;
  private renderPaypalEffect = effect(() => {
    if (this.loading() || this.stage() !== 'payment' || this.paypalRendered) return;
    this.paypalRendered = true;
    this.beginPayment();
  });

  // Creates the order first, then only renders PayPal's own button widget if
  // the backend actually started a real gateway payment (PAYMENT_INITIATED).
  // If PayPal is disabled server-side, createPaypalOrder() comes back already
  // PAID — stage() flips to 'thankyou' on its own, no PayPal SDK ever loads.
  private beginPayment() {
    this.actionLoading.set(true);
    this.error.set('');
    this.orgOrders.createPaypalOrder(this.orderId).subscribe({
      next: res => {
        this.data.set(res);
        this.actionLoading.set(false);
        if (res.order.status === 'PAYMENT_INITIATED' && res.order.gatewayReference) {
          this.renderPaypalButtons(res.order.gatewayReference);
        }
      },
      error: (e: any) => {
        this.error.set(this.msg(e));
        this.actionLoading.set(false);
        this.paypalRendered = false;
      }
    });
  }

  private renderPaypalButtons(paypalOrderId: string) {
    this.paypalLoader.load().then(paypal => {
      paypal.Buttons({
        createOrder: () => Promise.resolve(paypalOrderId),
        onApprove: (data: any) => {
          this.actionLoading.set(true);
          this.error.set('');
          this.orgOrders.capturePaypalOrder(this.orderId, data.orderID).subscribe({
            next: res => { this.data.set(res); this.actionLoading.set(false); },
            error: (e: any) => {
              this.error.set(this.msg(e));
              this.actionLoading.set(false);
              this.paypalRendered = false;
            }
          });
        },
        onError: (err: any) => {
          this.error.set('PayPal checkout error — please try again.');
          console.error(err);
        }
      }).render('#paypal-button-container-org');
    }).catch(() => this.error.set('Could not load PayPal checkout. Please refresh and try again.'));
  }

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

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
