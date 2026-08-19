import { Component, OnInit, signal, inject, computed, effect } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrgOrderService } from '../../../core/services/org-order.service';
import { OrgOrderResponse } from '../../../core/models/org-order.models';
import { RazorpayLoaderService } from '../../../core/services/razorpay-loader.service';

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
  private razorpayLoader = inject(RazorpayLoaderService);

  orderId = this.route.snapshot.paramMap.get('id')!;

  data = signal<OrgOrderResponse | null>(null);
  loading = signal(true);
  actionLoading = signal(false);
  error = signal('');
  agreed = signal(false);
  razorpayReady = signal(false);

  stage = computed<Stage>(() => {
    const status = this.data()?.order.status;
    if (status === 'PAID') return 'thankyou';
    if (status === 'AGREEMENT_ACCEPTED' || status === 'PAYMENT_INITIATED') return 'payment';
    return 'agreement';
  });

  private paymentInitiated = false;
  private renderPaymentEffect = effect(() => {
    if (this.loading() || this.stage() !== 'payment' || this.paymentInitiated) return;
    this.paymentInitiated = true;
    this.beginPayment();
  });

  // Creates the order first, then only starts the actual Razorpay checkout if
  // the backend started a real payment (PAYMENT_INITIATED). If the gateway is
  // disabled server-side, createRazorpayOrder() comes back already PAID —
  // stage() flips to 'thankyou' on its own, no gateway SDK ever loads.
  //
  // createRazorpayOrder() only accepts AGREEMENT_ACCEPTED orders — if the caller
  // already has a PAYMENT_INITIATED order (e.g. they started paying, left, and came
  // back via a dashboard link), the data already loaded in ngOnInit has everything
  // needed (gatewayReference/razorpayKeyId are always present on the order response),
  // so re-calling it would just 400. Skip straight to showing the Pay button instead.
  private beginPayment() {
    const existing = this.data();
    if (existing?.order.status === 'PAYMENT_INITIATED' && existing.order.gatewayReference) {
      this.razorpayReady.set(true);
      return;
    }

    this.actionLoading.set(true);
    this.error.set('');
    this.orgOrders.createRazorpayOrder(this.orderId).subscribe({
      next: res => {
        this.data.set(res);
        this.actionLoading.set(false);
        if (res.order.status === 'PAYMENT_INITIATED' && res.order.gatewayReference) {
          this.razorpayReady.set(true);
        }
      },
      error: (e: any) => {
        this.error.set(this.msg(e));
        this.actionLoading.set(false);
        this.paymentInitiated = false;
      }
    });
  }

  /** Opens Razorpay's own Checkout overlay — called from a real click on the "Pay Now" button. */
  payWithRazorpay() {
    const d = this.data();
    if (!d || !d.order.gatewayReference || !d.order.razorpayKeyId) return;
    this.razorpayLoader.load().then(Razorpay => {
      const rzp = new Razorpay({
        key: d.order.razorpayKeyId,
        amount: Math.round(d.order.totalAmount * 100),
        currency: d.order.currency,
        order_id: d.order.gatewayReference,
        name: 'HEAIL',
        description: '4-Pulse Diagnostic Suite',
        handler: (response: any) => {
          this.actionLoading.set(true);
          this.error.set('');
          this.orgOrders.verifyRazorpayPayment(this.orderId, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          }).subscribe({
            next: res => { this.data.set(res); this.actionLoading.set(false); },
            error: (e: any) => { this.error.set(this.msg(e)); this.actionLoading.set(false); }
          });
        },
        theme: { color: '#13294b' },
        modal: {
          ondismiss: () => {
            // Test mode only (enforced server-side) — closing the overlay without
            // paying completes the order anyway, since no real payment ever occurs.
            this.actionLoading.set(true);
            this.error.set('');
            this.orgOrders.forceCompleteTestPayment(this.orderId).subscribe({
              next: res => { this.data.set(res); this.actionLoading.set(false); },
              error: (e: any) => { this.error.set(this.msg(e)); this.actionLoading.set(false); }
            });
          }
        }
      });
      rzp.on('payment.failed', (resp: any) => {
        this.error.set('Payment failed — please try again.');
        console.error(resp);
      });
      rzp.open();
    }).catch(() => this.error.set('Could not load Razorpay checkout. Please refresh and try again.'));
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
