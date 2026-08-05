import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({ selector: 'app-buy-org', standalone: true, imports: [RouterLink], templateUrl: './buy-org.component.html' })
export class BuyOrgComponent {
  // There's only one type of registration now — every account can set up an
  // org round. Organisation name, headcount and industry are collected on
  // the next page (buy-org-form), before payment; the account is promoted
  // to ORG_ADMIN there once those details are saved.
}
