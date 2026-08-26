import { Component, OnInit, signal, inject, computed, effect, Input, Output, EventEmitter } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HrOrderService } from '../../../core/services/hr-order.service';
import { RazorpayLoaderService } from '../../../core/services/razorpay-loader.service';
import { Order } from '../../../core/models/order.models';

const AGREEMENT_VERSION = 'v1';

type Stage = 'agreement' | 'payment' | 'thankyou';

/** Same Razorpay checkout shape as LeaderPaymentComponent, minus the
 *  select/details stages — the pillar selection already happened on
 *  HrSelectComponent, which created this order before routing here. */
@Component({
  selector: 'app-hr-payment',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './hr-payment.component.html',
  styleUrl: './hr-payment.component.css'
})
export class HrPaymentComponent implements OnInit {
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private orderService = inject(HrOrderService);
  private razorpayLoader = inject(RazorpayLoaderService);

  orderId!: string;

  @Input() orderIdOverride: string | null = null;
  @Input() embedded = false;
  @Output() back = new EventEmitter<void>();

  order = signal<Order | null>(null);
  loading = signal(true);
  actionLoading = signal(false);
  error = signal('');
  agreed = signal(false);
  razorpayReady = signal(false);

  couponCode = signal('');
  couponLoading = signal(false);
  couponError = signal('');

  stage = computed<Stage>(() => {
    const o = this.order();
    if (!o) return 'agreement';
    if (o.status === 'PAID') return 'thankyou';
    if (o.status === 'AGREEMENT_ACCEPTED' || o.status === 'PAYMENT_INITIATED') return 'payment';
    return 'agreement';
  });

  private paymentInitiated = false;
  private renderPaymentEffect = effect(() => {
    const o = this.order();
    if (!o || this.stage() !== 'payment' || this.paymentInitiated) return;
    this.paymentInitiated = true;
    this.beginPayment(o.id);
  });

  ngOnInit() {
    this.orderId = this.orderIdOverride ?? this.route.snapshot.paramMap.get('orderId')!;
    this.orderService.getOrder(this.orderId).subscribe({
      next: o => { this.order.set(o); this.loading.set(false); },
      error: (e: any) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  // Same reasoning as LeaderPaymentComponent.beginPayment: only opens a real
  // Razorpay order for an AGREEMENT_ACCEPTED order; a PAYMENT_INITIATED one
  // already has everything needed (they left and came back), skip straight
  // to showing Pay.
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
        description: 'HR Competency Assessment',
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

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
