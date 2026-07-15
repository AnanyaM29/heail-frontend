import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type Stage = 'agreement' | 'payment' | 'thankyou';

@Component({
  selector: 'app-agreement-org',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './agreement-org.component.html'
})
export class AgreementOrgComponent {
  stage = signal<Stage>('agreement');
  agreed = signal(false);

  proceedToPayment() {
    if (this.agreed()) this.stage.set('payment');
  }

  pay() {
    this.stage.set('thankyou');
  }
}
