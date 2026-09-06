import { Component, signal, inject, computed, effect, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OrderService } from '../../../core/services/order.service';
import { AssessmentService } from '../../../core/services/assessment.service';
import { RazorpayLoaderService } from '../../../core/services/razorpay-loader.service';
import { Order } from '../../../core/models/order.models';
import { FRESH_AUTH_KEY } from '../../../core/guards/auth.guard';

const AGREEMENT_VERSION = 'v1';

type Stage = 'select' | 'details' | 'agreement' | 'payment' | 'thankyou';

@Component({
  selector: 'app-leader-payment',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css'
})
export class LeaderPaymentComponent {
  auth = inject(AuthService);
  private orderService = inject(OrderService);
  private assessment = inject(AssessmentService);
  private razorpayLoader = inject(RazorpayLoaderService);
  private router = inject(Router);

  /** Locked-down popup for the test — no toolbar/menubar, fills the screen —
   *  same window shape the Leader dashboard uses to launch the player. */
  private static readonly LOCKDOWN_FEATURES =
    `toolbar=no,location=no,menubar=no,status=no,directories=no,resizable=no,scrollbars=yes,` +
    `width=${screen.availWidth},height=${screen.availHeight},left=0,top=0`;

  starting = signal(false);

  /** Set when embedded inline on the pricing page — the 'select' stage's
   *  back link emits instead of navigating, since there's no real /pricing
   *  route change happening underneath it. */
  @Input() embedded = false;

  order = signal<Order | null>(null);
  detailsDone = signal(false);
  actionLoading = signal(false);
  error = signal('');
  agreed = signal(false);

  designation = signal('');
  organisationName = signal('');
  razorpayReady = signal(false);

  couponCode = signal('');
  couponLoading = signal(false);
  couponError = signal('');

  // No role gate here on purpose: the account's stored `role` is
  // single-valued and gets overwritten as it picks up other products (e.g.
  // an org admin who was originally a LEADER), so it can't be used to decide
  // who's allowed to buy this product. Ownership/ordering is enforced by
  // the backend (OrderService.requireOwnedOrder), same as the org flow.

  stage = computed<Stage>(() => {
    const o = this.order();
    if (!o) return 'select';
    if (o.status === 'PAID') return 'thankyou';
    if (o.status === 'AGREEMENT_ACCEPTED' || o.status === 'PAYMENT_INITIATED') return 'payment';
    return this.detailsDone() ? 'agreement' : 'details';
  });

  private paymentInitiated = false;
  private renderPaymentEffect = effect(() => {
    const o = this.order();
    if (!o || this.stage() !== 'payment' || this.paymentInitiated) return;
    this.paymentInitiated = true;
    this.beginPayment(o.id);
  });

  // Creates the order first, then only starts the actual Razorpay checkout if
  // the backend started a real payment (PAYMENT_INITIATED). If the gateway is
  // disabled server-side, createRazorpayOrder() comes back already PAID —
  // stage() flips to 'thankyou' on its own, no gateway SDK ever loads.
  //
  // createRazorpayOrder() only accepts AGREEMENT_ACCEPTED orders — if the caller
  // already has a PAYMENT_INITIATED order (e.g. they started paying, left, and came
  // back via a dashboard link), the order already loaded has everything needed
  // (gatewayReference/razorpayKeyId are always present on the order response), so
  // re-calling it would just 400. Skip straight to showing the Pay button instead.
  private beginPayment(orderId: string) {
    const existing = this.order();
    if (existing?.status === 'PAYMENT_INITIATED' && existing.gatewayReference) {
      this.razorpayReady.set(true);
      return;
    }

    this.actionLoading.set(true);
    this.error.set('');
    this.orderService.createRazorpayOrder(orderId).subscribe({
      next: res => {
        this.order.set(res);
        this.actionLoading.set(false);
        if (res.status === 'PAYMENT_INITIATED' && res.gatewayReference) {
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
    const o = this.order();
    if (!o || !o.gatewayReference || !o.razorpayKeyId) return;
    this.razorpayLoader.load().then(Razorpay => {
      const rzp = new Razorpay({
        key: o.razorpayKeyId,
        amount: Math.round(o.totalAmount * 100),
        currency: o.currency,
        order_id: o.gatewayReference,
        name: 'HEAIL',
        description: 'Gita Leader — Classic Assessment',
        handler: (response: any) => {
          this.actionLoading.set(true);
          this.error.set('');
          this.orderService.verifyRazorpayPayment(o.id, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          }).subscribe({
            next: updated => { this.order.set(updated); this.actionLoading.set(false); },
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
            this.orderService.forceCompleteTestPayment(o.id).subscribe({
              next: updated => { this.order.set(updated); this.actionLoading.set(false); },
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

  select() {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } }); return; }
    this.actionLoading.set(true);
    this.error.set('');
    this.orderService.createOrGetOrder().subscribe({
      next: o => {
        this.order.set(o);
        this.detailsDone.set(!!(o.metadata && (o.metadata['designation'] || o.metadata['organisationName'])));
        this.designation.set(o.metadata?.['designation'] ?? '');
        this.organisationName.set(o.metadata?.['organisationName'] ?? '');
        this.actionLoading.set(false);
      },
      error: (e: any) => { this.actionLoading.set(false); this.error.set(this.msg(e)); }
    });
  }

  saveDetails() {
    const o = this.order();
    if (!o) return;
    this.actionLoading.set(true);
    this.error.set('');
    this.orderService.updateDetails(o.id, this.designation(), this.organisationName()).subscribe({
      next: updated => { this.order.set(updated); this.detailsDone.set(true); this.actionLoading.set(false); },
      error: (e: any) => { this.actionLoading.set(false); this.error.set(this.msg(e)); }
    });
  }

  applyCoupon() {
    const o = this.order();
    const code = this.couponCode().trim();
    if (!o || !code) return;
    this.couponLoading.set(true);
    this.couponError.set('');
    this.orderService.applyCoupon(o.id, code).subscribe({
      next: updated => { this.order.set(updated); this.couponLoading.set(false); },
      error: (e: any) => { this.couponError.set(this.msg(e)); this.couponLoading.set(false); }
    });
  }

  acceptAgreement() {
    const o = this.order();
    if (!o || !this.agreed()) return;
    this.actionLoading.set(true);
    this.error.set('');
    this.orderService.acceptAgreement(o.id, AGREEMENT_VERSION).subscribe({
      next: updated => { this.order.set(updated); this.actionLoading.set(false); },
      error: (e: any) => { this.error.set(this.msg(e)); this.actionLoading.set(false); }
    });
  }

  /** Post-payment "Start Assessment" — actually starts the sitting and opens the
   *  player, rather than dropping the buyer on the dashboard to hunt for a button.
   *  Mirrors LeaderDashboardComponent.startAssessment(). */
  startAssessment() {
    if (this.starting()) return;
    this.starting.set(true);
    this.error.set('');
    // Already signed in and paying — mark the session fresh-authed BEFORE opening
    // the popup so it inherits the marker and assessmentEntryGuard admits it.
    try { sessionStorage.setItem(FRESH_AUTH_KEY, '1'); } catch {}
    // Open synchronously in the click handler or the browser blocks the popup;
    // the target URL isn't known yet, so open blank and redirect once start() returns.
    const testWindow = window.open('', '_blank', LeaderPaymentComponent.LOCKDOWN_FEATURES);
    this.assessment.start().subscribe({
      next: res => {
        this.starting.set(false);
        const url = this.router.createUrlTree(['/leader/assessment', res.sessionId]).toString();
        if (testWindow) testWindow.location.href = url;
        else window.open(url, '_blank', LeaderPaymentComponent.LOCKDOWN_FEATURES);
      },
      error: (e: any) => {
        this.starting.set(false);
        testWindow?.close();
        this.error.set(this.msg(e));
      }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
