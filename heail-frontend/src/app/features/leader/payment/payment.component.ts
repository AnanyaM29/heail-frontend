import { Component, signal, inject, computed, effect } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OrderService } from '../../../core/services/order.service';
import { PaypalLoaderService } from '../../../core/services/paypal-loader.service';
import { Order } from '../../../core/models/order.models';

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
  private paypalLoader = inject(PaypalLoaderService);

  order = signal<Order | null>(null);
  detailsDone = signal(false);
  actionLoading = signal(false);
  error = signal('');
  agreed = signal(false);

  designation = signal('');
  organisationName = signal('');

  isLeader = computed(() => this.auth.role() === 'LEADER');

  stage = computed<Stage>(() => {
    const o = this.order();
    if (!o) return 'select';
    if (o.status === 'PAID') return 'thankyou';
    if (o.status === 'AGREEMENT_ACCEPTED' || o.status === 'PAYMENT_INITIATED') return 'payment';
    return this.detailsDone() ? 'agreement' : 'details';
  });

  private paypalRendered = false;
  private renderPaypalEffect = effect(() => {
    const o = this.order();
    if (!o || this.stage() !== 'payment' || this.paypalRendered) return;
    this.paypalRendered = true;
    this.beginPayment(o.id);
  });

  // Creates the order first, then only renders PayPal's own button widget if
  // the backend actually started a real gateway payment (PAYMENT_INITIATED).
  // If PayPal is disabled server-side, createPaypalOrder() comes back already
  // PAID — stage() flips to 'thankyou' on its own, no PayPal SDK ever loads.
  private beginPayment(orderId: string) {
    this.actionLoading.set(true);
    this.error.set('');
    this.orderService.createPaypalOrder(orderId).subscribe({
      next: res => {
        this.order.set(res);
        this.actionLoading.set(false);
        if (res.status === 'PAYMENT_INITIATED' && res.gatewayReference) {
          this.renderPaypalButtons(orderId, res.gatewayReference);
        }
      },
      error: (e: any) => {
        this.error.set(this.msg(e));
        this.actionLoading.set(false);
        this.paypalRendered = false;
      }
    });
  }

  private renderPaypalButtons(orderId: string, paypalOrderId: string) {
    this.paypalLoader.load().then(paypal => {
      paypal.Buttons({
        createOrder: () => Promise.resolve(paypalOrderId),
        onApprove: (data: any) => {
          this.actionLoading.set(true);
          this.error.set('');
          this.orderService.capturePaypalOrder(orderId, data.orderID).subscribe({
            next: updated => { this.order.set(updated); this.actionLoading.set(false); },
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
      }).render('#paypal-button-container');
    }).catch(() => this.error.set('Could not load PayPal checkout. Please refresh and try again.'));
  }

  select() {
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
