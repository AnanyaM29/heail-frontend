import { Component, signal, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OrderService } from '../../../core/services/order.service';
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

  pay() {
    const o = this.order();
    if (!o) return;
    this.actionLoading.set(true);
    this.error.set('');
    this.orderService.pay(o.id).subscribe({
      next: updated => { this.order.set(updated); this.actionLoading.set(false); },
      error: (e: any) => { this.error.set(this.msg(e)); this.actionLoading.set(false); }
    });
  }

  private msg(e: any) {
    return e?.error?.message ?? e?.error?.error ?? 'Something went wrong. Please try again.';
  }
}
